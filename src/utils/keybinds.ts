/**
 * keybinds.ts — HyperSpeedCube / Standard Speedcubing simulator keybindings.
 *
 * Implements the standard 2-hand ergonomic home-row scheme:
 * - Right hand dominant turns: U (J), R (I/K), F (H), B (P/O), D' (L)
 * - Left hand turns: U' (F), L (D/E), F' (G), B' (Q/W), D (S)
 * - Slices & rotations: M/M' (N/B), x/y (Y/;)
 */

export interface KeybindDefinition {
  key: string;
  displayKey: string;
  move: string;
  hand: 'left' | 'right';
  description: string;
}

export type KeybindPresetId = 'hyperspeedcube' | 'direct';

export interface KeybindPreset {
  id: KeybindPresetId;
  name: string;
  description: string;
  keyMap: Record<string, string>;
}

export const HYPERSPEEDCUBE_KEYBINDS: KeybindDefinition[] = [
  // --- Right hand ---
  { key: 'j', displayKey: 'J', move: 'U',  hand: 'right', description: 'Up layer clockwise' },
  { key: 'i', displayKey: 'I', move: 'R',  hand: 'right', description: 'Right layer clockwise' },
  { key: 'k', displayKey: 'K', move: "R'", hand: 'right', description: 'Right layer counter-clockwise' },
  { key: 'm', displayKey: 'M', move: 'R2', hand: 'right', description: 'Right layer double turn' },
  { key: 'h', displayKey: 'H', move: 'F',  hand: 'right', description: 'Front layer clockwise' },
  { key: 'l', displayKey: 'L', move: "D'", hand: 'right', description: 'Down layer counter-clockwise' },
  { key: 'p', displayKey: 'P', move: 'B',  hand: 'right', description: 'Back layer clockwise' },
  { key: 'o', displayKey: 'O', move: "B'", hand: 'right', description: 'Back layer counter-clockwise' },
  { key: 'n', displayKey: 'N', move: 'M',  hand: 'right', description: 'Middle slice down' },
  { key: ';', displayKey: ';', move: 'y',  hand: 'right', description: 'Rotate cube right (y)' },

  // --- Left hand ---
  { key: 'f', displayKey: 'F', move: "U'", hand: 'left', description: 'Up layer counter-clockwise' },
  { key: 'c', displayKey: 'C', move: 'U2', hand: 'left', description: 'Up layer double turn' },
  { key: 'd', displayKey: 'D', move: 'L',  hand: 'left', description: 'Left layer clockwise' },
  { key: 'e', displayKey: 'E', move: "L'", hand: 'left', description: 'Left layer counter-clockwise' },
  { key: 'v', displayKey: 'V', move: 'L2', hand: 'left', description: 'Left layer double turn' },
  { key: 'g', displayKey: 'G', move: "F'", hand: 'left', description: 'Front layer counter-clockwise' },
  { key: 's', displayKey: 'S', move: 'D',  hand: 'left', description: 'Down layer clockwise' },
  { key: 'z', displayKey: 'Z', move: 'D2', hand: 'left', description: 'Down layer double turn' },
  { key: 'w', displayKey: 'W', move: 'B',  hand: 'left', description: 'Back layer clockwise' },
  { key: 'q', displayKey: 'Q', move: "B'", hand: 'left', description: 'Back layer counter-clockwise' },
  { key: 'b', displayKey: 'B', move: "M'", hand: 'left', description: 'Middle slice up' },
  { key: 'a', displayKey: 'A', move: "y'", hand: 'left', description: 'Rotate cube left (y\')' },
];

export const DIRECT_KEYBINDS: KeybindDefinition[] = [
  { key: 'u', displayKey: 'u', move: 'U', hand: 'right', description: 'U face' },
  { key: 'U', displayKey: 'Shift+U', move: "U'", hand: 'right', description: "U' face" },
  { key: 'r', displayKey: 'r', move: 'R', hand: 'right', description: 'R face' },
  { key: 'R', displayKey: 'Shift+R', move: "R'", hand: 'right', description: "R' face" },
  { key: 'l', displayKey: 'l', move: 'L', hand: 'left', description: 'L face' },
  { key: 'L', displayKey: 'Shift+L', move: "L'", hand: 'left', description: "L' face" },
  { key: 'f', displayKey: 'f', move: 'F', hand: 'right', description: 'F face' },
  { key: 'F', displayKey: 'Shift+F', move: "F'", hand: 'right', description: "F' face" },
  { key: 'b', displayKey: 'b', move: 'B', hand: 'left', description: 'B face' },
  { key: 'B', displayKey: 'Shift+B', move: "B'", hand: 'left', description: "B' face" },
  { key: 'd', displayKey: 'd', move: 'D', hand: 'left', description: 'D face' },
  { key: 'D', displayKey: 'Shift+D', move: "D'", hand: 'left', description: "D' face" },
];

export const KEYBIND_PRESETS: Record<KeybindPresetId, KeybindPreset> = {
  hyperspeedcube: {
    id: 'hyperspeedcube',
    name: 'HyperSpeedCube / Speedcubing Standard',
    description: 'Ergonomic two-handed home row layout (J/F for U/U\', I/K for R/R\', H/G for F/F\', D/E for L/L\')',
    keyMap: HYPERSPEEDCUBE_KEYBINDS.reduce((acc, curr) => {
      acc[curr.key] = curr.move;
      return acc;
    }, {} as Record<string, string>),
  },
  direct: {
    id: 'direct',
    name: 'Direct Notation (U/R/L/F/B/D)',
    description: 'Direct letter keys with Shift for prime turns',
    keyMap: DIRECT_KEYBINDS.reduce((acc, curr) => {
      acc[curr.key] = curr.move;
      return acc;
    }, {} as Record<string, string>),
  },
};
