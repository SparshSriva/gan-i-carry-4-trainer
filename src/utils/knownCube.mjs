// Fixed address supplied by the owner for this specific physical cube.
export const KNOWN_CUBE=Object.freeze({name:'GANic4_3730',mac:'0C:3D:5E:A9:37:30'});
export function knownCubeMac(name){return name===KNOWN_CUBE.name?KNOWN_CUBE.mac:null;}
