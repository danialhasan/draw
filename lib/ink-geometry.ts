export type Point = readonly [number, number];
export type InkStroke = {
  id: string; x: number; y: number; width: number; height: number;
  angle: number; points: readonly Point[];
};
export type ShapeKind = 'rectangle' | 'ellipse' | 'triangle' | 'diamond' | 'polygon' | 'arrow' | 'double_arrow' | 'line';
export const shapeKinds: ShapeKind[] = ['rectangle', 'ellipse', 'triangle', 'diamond', 'polygon', 'arrow', 'double_arrow', 'line'];
export const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function worldPoints(stroke: InkStroke): Point[] {
  const cx = stroke.x + stroke.width / 2, cy = stroke.y + stroke.height / 2;
  const c = Math.cos(stroke.angle || 0), s = Math.sin(stroke.angle || 0);
  return stroke.points.map(([x, y]) => {
    const dx = stroke.x + x - cx, dy = stroke.y + y - cy;
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
  });
}

export function inkBounds(strokes: readonly InkStroke[]) {
  const points = strokes.flatMap(worldPoints);
  if (!points.length) throw new Error('This stroke has no points.');
  const x = Math.min(...points.map(p => p[0])), y = Math.min(...points.map(p => p[1]));
  return {x, y, width: Math.max(...points.map(p => p[0])) - x, height: Math.max(...points.map(p => p[1])) - y};
}

const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
export function outline(strokes: readonly InkStroke[], corners?: number): Point[] {
  const points = strokes.flatMap(worldPoints).sort((a,b) => a[0] - b[0] || a[1] - b[1]);
  const half = (input: Point[]) => {const result: Point[] = []; for (const p of input) {while (result.length > 1 && cross(result.at(-2)!, result.at(-1)!, p) <= 0) result.pop(); result.push(p);}return result;};
  const hull = [...half(points).slice(0,-1), ...half([...points].reverse()).slice(0,-1)];
  const bounds = inkBounds(strokes), tolerance = Math.max(bounds.width, bounds.height) ** 2 * 0.008;
  while (hull.length > (corners || 3)) {
    const areas = hull.map((p,i) => Math.abs(cross(hull[(i + hull.length - 1) % hull.length], p, hull[(i + 1) % hull.length])));
    const smallest = Math.min(...areas);
    if (!corners && smallest > tolerance) break;
    hull.splice(areas.indexOf(smallest), 1);
  }
  return hull;
}

export function fitArrow(strokes: readonly InkStroke[], direction?: string, bothEnds=false): {tail: Point; tip: Point} {
  const paths = strokes.map(worldPoints).filter(p => p.length > 1);
  if (!paths.length) throw new Error('Draw a longer arrow shaft.');
  // The shaft has the longest end-to-end distance; retracing the head does not make it the shaft.
  paths.sort((a,b) => distance(b[0], b.at(-1)!) - distance(a[0], a.at(-1)!));
  const shaft = paths[0];
  let a = shaft[0], b = shaft.at(-1)!;
  const other = paths.slice(1).flat();
  if (other.length && !bothEnds) {
    const centroid: Point = [other.reduce((v,p) => v+p[0],0)/other.length, other.reduce((v,p) => v+p[1],0)/other.length];
    if (distance(centroid, a) < distance(centroid, b)) [a,b] = [b,a];
  } else if (direction && !bothEnds) {
    const vector: Record<string, Point> = {right:[1,0],left:[-1,0],up:[0,-1],down:[0,1],up_right:[1,-1],up_left:[-1,-1],down_right:[1,1],down_left:[-1,1]};
    const d = vector[direction];
    if (d && (b[0]-a[0])*d[0]+(b[1]-a[1])*d[1] < 0) [a,b] = [b,a];
  }
  const length = distance(a,b);
  if (length < 2) throw new Error('Draw a longer arrow shaft.');
  const u: Point = [(b[0]-a[0])/length,(b[1]-a[1])/length];
  // Use the head's actual outer tip, including a head that overshoots or crosses the shaft.
  const candidates = other.length ? other : shaft;
  const tip = candidates.reduce((best,p) => (p[0]-a[0])*u[0]+(p[1]-a[1])*u[1] > (best[0]-a[0])*u[0]+(best[1]-a[1])*u[1] ? p : best, b);
  if (bothEnds) {
    // Keep the shaft direction; uneven heads should extend it, not rotate it.
    const positions=paths.flat().map(p=>(p[0]-a[0])*u[0]+(p[1]-a[1])*u[1]);
    const at=(position:number):Point=>[a[0]+position*u[0],a[1]+position*u[1]];
    return {tail:at(Math.min(...positions)),tip:at(Math.max(...positions))};
  }
  return {tail:a,tip};
}

export function canReplaceInk(snapshot: readonly {id:string;version:number;versionNonce:number}[], current: readonly {id:string;version:number;versionNonce:number;isDeleted:boolean}[]) {
  const byId = new Map(current.map(e=>[e.id,e]));
  return snapshot.every(e => {const now=byId.get(e.id);return now && !now.isDeleted && now.version===e.version && now.versionNonce===e.versionNonce;});
}

// A small new mark at a straight connector endpoint can complete its arrowhead.
// Marks in the middle of a connector or separate large drawings do not join it.
export function arrowHeadGap(ink:InkStroke,connector:InkStroke):number {
  const points=worldPoints(connector);
  if(points.length!==2)return Infinity;
  const span=distance(points[0],points[1]);
  if(span<30)return Infinity;
  const bounds=inkBounds([ink]);
  if(Math.hypot(bounds.width,bounds.height)>Math.max(40,span*.65))return Infinity;
  const gap=Math.min(...worldPoints(ink).flatMap(p=>points.map(end=>distance(p,end))));
  return gap<=24?gap:Infinity;
}
