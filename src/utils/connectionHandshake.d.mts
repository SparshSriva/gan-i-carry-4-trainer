import type { GanCubeConnection } from 'gan-web-bluetooth';
export function initializeCubeConnection(conn:GanCubeConnection,progress?:(message:string)=>void,timeoutMs?:number):Promise<string>;
