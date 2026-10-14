import { validateScramble } from './solveSession';
export const TNOODLE_VERSION='1.2.3';
export interface ScrambleProvenance { kind:'tnoodle-wca'|'custom'; program?:string; version?:string; event?:'333'; signedBuild?:boolean; generatedAt?:number }
export async function generateOfficialScramble():Promise<{scramble:string;provenance:ScrambleProvenance}> {
  const options={signal:AbortSignal.timeout(30000)};
  const versionResponse=await fetch('/api/tnoodle/version',options);
  if(!versionResponse.ok)throw new Error('The local TNoodle service is unavailable. Start the app with npm run dev, or paste a scramble.');
  const version=await versionResponse.json();
  if(version.projectName!=='TNoodle-WCA' || version.projectVersion!==TNOODLE_VERSION || version.signedBuild!==true)throw new Error(`A signed TNoodle-WCA ${TNOODLE_VERSION} service is required. No unofficial fallback was used.`);
  const response=await fetch('/api/tnoodle/frontend/puzzle/333/scramble',{...options,method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!response.ok)throw new Error('TNoodle could not generate a scramble. Try again.');
  const data=await response.json();
  if(typeof data.scramble!=='string')throw new Error('TNoodle returned an invalid scramble.');
  return {scramble:validateScramble(data.scramble),provenance:{kind:'tnoodle-wca',program:version.projectName,version:version.projectVersion,event:'333',signedBuild:true,generatedAt:Date.now()}};
}
