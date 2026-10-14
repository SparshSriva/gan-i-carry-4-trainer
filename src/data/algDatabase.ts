import type { AlgCase, AlgSubset } from '../types';
import catalog from './algorithmCatalog.json';

export const ALL_CASES: AlgCase[] = catalog.map(c => ({
  ...c, subset: c.subset as AlgSubset,
  status: 'unlearned', attempts: 0, avgRecognitionMs: 0, avgExecutionMs: 0, mistakeRate: 0,
}));
export function getCasesBySubset(subset: AlgSubset): AlgCase[] { return ALL_CASES.filter(c => c.subset === subset); }
