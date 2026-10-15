"""Native lifecycle tests with fake clients; never access Bluetooth hardware."""
import asyncio
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import sys
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location('ble_worker', Path(__file__).parents[1] / 'scripts/bridge/ble_worker.py')
worker = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, {'bleak': SimpleNamespace(BleakClient=None, BleakScanner=None)}):
    spec.loader.exec_module(worker)

class NativeLifecycleTests(unittest.IsolatedAsyncioTestCase):
    async def test_windows_reads_uncached_services_and_reuses_scanned_device(self):
        device, callback = object(), lambda _: None
        class Client:
            def __init__(self, selected, **kwargs):
                self.selected, self.options = selected, kwargs
                self.is_connected = False
            async def connect(self): self.is_connected = True
            async def disconnect(self): self.is_connected = False
        with patch.object(worker, 'BleakClient', Client), patch.object(worker.sys, 'platform', 'win32'):
            client = await worker.open_client(device, callback)
            self.assertIs(client.selected, device)
            self.assertEqual(client.options['winrt'], {'use_cached_services': False})
            self.assertEqual(set(client.options['services']), {
                '8653000a-43e6-47b7-9cb0-5fc21d4ae340',
                '00000010-0000-fff7-fff6-fff5fff4fff0',
                '6e400001-b5a3-f393-e0a9-e50e24dc4179',
            })
            self.assertIs(client.options['disconnected_callback'], callback)

    async def test_failed_or_closed_connection_is_cleaned_up(self):
        for fail in [True, False]:
            instances = []
            class Client:
                def __init__(self, *_args, **_kwargs): self.is_connected = False; self.closed = False; instances.append(self)
                async def connect(self):
                    if fail: raise OSError('service discovery failed')
                async def disconnect(self): self.closed = True
            with patch.object(worker, 'BleakClient', Client):
                with self.assertRaises(OSError if fail else ConnectionError): await worker.open_client(object(), lambda _: None)
                self.assertTrue(instances[0].closed)

    async def test_cancellation_releases_partial_client_and_propagates(self):
        instances=[]
        class Client:
            def __init__(self, *_args, **_kwargs): self.closed=False; instances.append(self)
            async def connect(self): raise asyncio.CancelledError()
            async def disconnect(self): self.closed=True
        with patch.object(worker, 'BleakClient', Client):
            with self.assertRaises(asyncio.CancelledError): await worker.open_client(object(), lambda _: None)
            self.assertTrue(instances[0].closed)

if __name__ == '__main__': unittest.main()
