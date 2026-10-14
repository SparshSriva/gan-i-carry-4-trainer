/** View pose in degrees; independent of logical cube moves and BLE face names. */
export interface CubeOrientation { yaw: number; pitch: number; roll: number }
export const DEFAULT_CUBE_ORIENTATION: CubeOrientation = { yaw: 30, pitch: 35, roll: 0 };
const KEY = 'ganicv4_view_orientation_v1';
const wrap = (n: number) => Math.round((((n + 180) % 360 + 360) % 360 - 180) * 10) / 10;
export function normalizeOrientation(pose: CubeOrientation): CubeOrientation {
  return { yaw: wrap(pose.yaw), pitch: Math.round(Math.max(-89, Math.min(89, pose.pitch)) * 10) / 10, roll: wrap(pose.roll) };
}
export function loadOrientation(): CubeOrientation {
  try {
    const pose = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (pose && ['yaw', 'pitch', 'roll'].every(k => typeof pose[k] === 'number' && Number.isFinite(pose[k]))) return normalizeOrientation(pose);
  } catch { /* Use the default if storage is unavailable. */ }
  return { ...DEFAULT_CUBE_ORIENTATION };
}
export function saveOrientation(pose: CubeOrientation): void {
  try { localStorage.setItem(KEY, JSON.stringify(pose)); } catch { /* Viewing still works without storage. */ }
}
