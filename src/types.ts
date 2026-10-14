// ─── Core Types ───────────────────────────────────────────────────────────────

export type Face = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';

export type Move =
  | 'U' | "U'" | 'U2'
  | 'D' | "D'" | 'D2'
  | 'F' | "F'" | 'F2'
  | 'B' | "B'" | 'B2'
  | 'L' | "L'" | 'L2'
  | 'R' | "R'" | 'R2'
  | 'M' | "M'" | 'M2'
  | 'E' | "E'" | 'E2'
  | 'S' | "S'" | 'S2'
  | 'r' | "r'" | 'r2'
  | 'l' | "l'" | 'l2'
  | 'u' | "u'" | 'u2'
  | 'd' | "d'" | 'd2'
  | 'f' | "f'" | 'f2'
  | 'b' | "b'" | 'b2'
  | 'x' | "x'" | 'x2'
  | 'y' | "y'" | 'y2'
  | 'z' | "z'" | 'z2';

// ─── Trainer State Machine ─────────────────────────────────────────────────────

export type TrainerPhase =
  | 'IDLE'
  | 'CASE_SELECTION'
  | 'SCRAMBLING'
  | 'ERROR_RECOVERY'
  | 'RECOGNIZING'
  | 'EXECUTING'
  | 'REVIEW';

// ─── Algorithm Database ────────────────────────────────────────────────────────

export type AlgSubset = 'PLL' | 'OLL' | 'F2L';
export type LearningStatus = 'unlearned' | 'learning' | 'learned';

export interface AlgCase {
  id: string;
  subset: AlgSubset;
  name: string;
  alg: string;          // primary algorithm string
  setup?: string;       // optional explicit setup scramble (overrides inverse alg)
  status: LearningStatus;
  attempts: number;
  lastPracticed?: number; // epoch ms
  avgRecognitionMs: number;
  avgExecutionMs: number;
  mistakeRate: number;  // 0–1
}

// ─── Telemetry ─────────────────────────────────────────────────────────────────

export interface MoveTimestamp {
  move: string;
  timestamp: number; // epoch ms
}

export interface AttemptResult {
  caseId: string;
  recognitionMs: number;
  executionMs: number;
  tps: number;
  moves?: string[];
  hadMistake?: boolean;
  moveDeltas: number[]; // ms between consecutive moves
  timestamp: number;
}

// ─── BLE Events ────────────────────────────────────────────────────────────────

export type BleEvent =
  | { type: 'FACELETS'; data: string }
  | { type: 'MOVE'; move: string; timestamp: number; serial: number }
  | { type: 'BATTERY'; level: number }
  | { type: 'DISCONNECT' };

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

// ─── App Navigation ────────────────────────────────────────────────────────────

export type AppView = 'trainer' | 'timer' | 'library' | 'analytics';
