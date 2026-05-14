import { Point, vector, angleBetweenVectors } from './geometry';

export interface LegPoints {
  fhc: Point; // Femoral Head Center
  kcf: Point; // Knee Center (Femoral)
  kct: Point; // Knee Center (Tibial)
  ac: Point;  // Ankle Center
  iu: Point;  // Inner (Medial) Upper
  ou: Point;  // Outer (Lateral) Upper
  il: Point;  // Inner (Medial) Lower
  ol: Point;  // Outer (Lateral) Lower
}

export function calculateLDFA(points: LegPoints): number {
  // LDFA: angle between femur axis (kcf→fhc) and upper joint line (iu→ou)
  const vFemur = vector(points.kcf, points.fhc);
  const vLateral = vector(points.iu, points.ou);
  return angleBetweenVectors(vFemur, vLateral);
}

export function calculateMPTA(points: LegPoints): number {
  // MPTA: angle between tibia axis (kct→ac) and lower joint line (ol→il)
  const vTibia = vector(points.kct, points.ac);
  const vMedial = vector(points.ol, points.il);
  return angleBetweenVectors(vTibia, vMedial);
}
