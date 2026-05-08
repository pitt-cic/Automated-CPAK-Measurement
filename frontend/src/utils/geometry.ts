export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export function vector(from: Point, to: Point): Vector {
  return { x: to.x - from.x, y: to.y - from.y };
}

export function magnitude(v: Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function dot(a: Vector, b: Vector): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Vector, b: Vector): number {
  return a.x * b.y - a.y * b.x;
}

export function angleBetweenVectors(a: Vector, b: Vector): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;

  const cosAngle = dot(a, b) / (magA * magB);
  const clamped = Math.max(-1, Math.min(1, cosAngle));
  return Math.acos(clamped) * (180 / Math.PI);
}

export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function extendLine(
  p1: Point,
  p2: Point,
  extensionPixels: number
): { start: Point; end: Point } {
  const dir = vector(p1, p2);
  const mag = magnitude(dir);
  if (mag === 0) return { start: p1, end: p2 };

  const unitX = dir.x / mag;
  const unitY = dir.y / mag;

  return {
    start: { x: p1.x - unitX * extensionPixels, y: p1.y - unitY * extensionPixels },
    end: { x: p2.x + unitX * extensionPixels, y: p2.y + unitY * extensionPixels },
  };
}
