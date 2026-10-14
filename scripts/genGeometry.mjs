import fs from 'node:fs';

const g = JSON.parse(fs.readFileSync('src_geometry.json', 'utf8'));

const out = `/**
 * navaCakraGeometry.ts — Mathematical geometry for the 9-Circles Permutation Graph.
 *
 * Encodes the 9 circular layer tracks, 54 node positions (facelet coordinates),
 * and exact permutation transition arrays for each move.
 */

export interface CakraCircle {
  name: string;
  axis: number; // 0=X, 1=Y, 2=Z
  layer: number; // -1, 0, 1
  cx: number;
  cy: number;
  r: number;
  belt: number[];
  cycle: string[];
}

export const NAVA_CAKRA_CIRCLES: CakraCircle[] = ${JSON.stringify(
  g.circles.map((c) => ({
    name: c.name,
    axis: c.axis,
    layer: c.layer,
    cx: c.cx,
    cy: c.cy,
    r: c.r,
    belt: c.belt,
    cycle: c.cycle,
  })),
  null,
  2
)};

export const NAVA_CAKRA_NODES: [number, number][] = ${JSON.stringify(g.nodeXY)};

export const NAVA_CAKRA_NODE_SCALES: number[] = ${JSON.stringify(g.nodeScale)};

export const NAVA_CAKRA_MOVES: Record<string, number[]> = ${JSON.stringify(g.moves)};

export const SOLVED_FACELETS = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

export const FACELET_COLORS: Record<string, string> = {
  U: "#FFFFFF",
  D: "#FFD500",
  F: "#009A44",
  B: "#003DA5",
  R: "#BA0C2F",
  L: "#FE5000",
};
`;

fs.writeFileSync('src/data/navaCakraGeometry.ts', out);
console.log('Successfully wrote src/data/navaCakraGeometry.ts');
