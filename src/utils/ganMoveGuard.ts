/** GAN's public event contract specifies a circular 0–255 move serial. */
export class GanMoveGuard {
  private serial:number|null=null;
  reset():void {this.serial=null;}
  accept(serial:number,timestamp:number|null):'ok'|'duplicate'|'gap'|'untimed' {
    if(this.serial===serial)return 'duplicate';
    if(this.serial!==null && serial!==(this.serial+1)%256)return 'gap';
    this.serial=serial;
    return timestamp===null || !Number.isFinite(timestamp)?'untimed':'ok';
  }
}
