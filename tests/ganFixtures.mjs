import { createCipheriv } from 'node:crypto';
export function encryptedFixture(payload){
  const key=[1,2,0x42,0x28,0x31,0x91,0x16,7,0x20,5,0x18,0x54,0x42,0x11,0x12,0x53];
  const iv=[0x11,3,0x32,0x28,0x21,1,0x76,0x27,0x20,0x95,0x78,0x14,0x32,0x12,2,0x43];
  for(let i=0;i<6;i++){key[i]=(key[i]+6-i)%255;iv[i]=(iv[i]+6-i)%255;}
  const cipher=createCipheriv('aes-128-cbc',Buffer.from(key),Buffer.from(iv));cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(payload),cipher.final()]).toString('hex');
}
export function solvedPacket(){
  const bytes=Buffer.alloc(16);bytes.set([0xED,14]);
  const bits=(start,length,value)=>{for(let i=0;i<length;i++)if(value&(1<<(length-i-1)))bytes[(start+i)>>3]|=1<<(7-((start+i)&7));};
  for(let i=0;i<7;i++)bits(32+i*3,3,i);
  for(let i=0;i<11;i++)bits(69+i*4,4,i);
  return bytes;
}
