"""Native BLE transport only; GAN decoding remains in gan-web-bluetooth."""
import asyncio
import json
import re
import sys
from bleak import BleakClient, BleakScanner

def emit(value):
    print(json.dumps(value), flush=True)

def advertised_mac(data):
    for company, payload in data.items():
        if company & 255 == 1 and len(payload) >= 9:
            return ':'.join(f'{b:02X}' for b in reversed(payload[3:9]))
    return None

async def main():
    devices = {}
    client = None
    try:
        while True:
            line = await asyncio.to_thread(sys.stdin.readline)
            if not line:
                break
            request = json.loads(line)
            try:
                op = request['op']
                if op == 'scan':
                    found = await asyncio.wait_for(BleakScanner.discover(timeout=5, return_adv=True), timeout=12)
                    devices = {key: (dev, adv) for key, (dev, adv) in found.items()
                               if (adv.local_name or dev.name or '').startswith(('GAN', 'MG', 'AiCube'))}
                    result = []
                    for key, (dev, adv) in devices.items():
                        address = dev.address.upper()
                        mac = advertised_mac(adv.manufacturer_data)
                        if not mac and re.fullmatch(r'(?:[0-9A-F]{2}:){5}[0-9A-F]{2}', address):
                            mac = address
                        result.append({'id': key, 'name': adv.local_name or dev.name,
                                       'mac': mac, 'rssi': adv.rssi})
                elif op == 'connect':
                    if client:
                        await client.disconnect()
                    if request['deviceId'] not in devices:
                        raise ValueError('Select a cube from a fresh scan.')
                    client = BleakClient(devices[request['deviceId']][0],
                                         disconnected_callback=lambda _: emit({'event': 'disconnect'}))
                    await asyncio.wait_for(client.connect(), timeout=25)
                    result = [{'uuid': service.uuid, 'characteristics': [
                        {'uuid': c.uuid, 'properties': c.properties} for c in service.characteristics
                    ]} for service in client.services]
                elif op == 'subscribe':
                    await client.start_notify(request['uuid'], lambda _, data, uuid=request['uuid']: emit(
                        {'event': 'notification', 'uuid': uuid, 'hex': bytes(data).hex()}))
                    result = True
                elif op == 'unsubscribe':
                    if client and client.is_connected:
                        await client.stop_notify(request['uuid'])
                    result = True
                elif op == 'write':
                    await client.write_gatt_char(request['uuid'], bytes.fromhex(request['hex']),
                                                 response=request['response'])
                    result = True
                elif op == 'disconnect':
                    if client:
                        await client.disconnect()
                        client = None
                    result = True
                else:
                    raise ValueError('Unknown native operation.')
                emit({'id': request['id'], 'result': result})
            except Exception as error:
                message = str(error.args[0]) if error.args and isinstance(error.args[0], str) else str(error)
                emit({'id': request['id'], 'error': message or type(error).__name__})
    finally:
        if client and client.is_connected:
            await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
