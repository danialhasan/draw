import {inkBounds,type InkStroke} from './ink-geometry.ts';
type Stroke={x:number;y:number;width:number;height:number;points?:InkStroke['points'];angle?:number;id?:string};
// Nearby pieces remain one gesture; separate drawings are classified independently.
export function groupInk<T extends Stroke>(strokes:readonly T[]):T[][]{
  const groups:T[][]=[];
  const bounds=new Map(strokes.map(s=>[s,s.points?.length?inkBounds([s as InkStroke]):s]));
  const near=(left:T,right:T)=>{
    const a=bounds.get(left)!,b=bounds.get(right)!;
    const gapX=Math.max(0,a.x-(b.x+b.width),b.x-(a.x+a.width));
    const gapY=Math.max(0,a.y-(b.y+b.height),b.y-(a.y+a.height));
    return Math.hypot(gapX,gapY)<=24;
  };
  for(const s of strokes){
    const matches=groups.filter(g=>g.some(p=>near(s,p)));
    if(!matches.length)groups.push([s]);
    else{const first=matches[0];first.push(s);for(const other of matches.slice(1)){first.push(...other);groups.splice(groups.indexOf(other),1);}}
  }
  return groups;
}
