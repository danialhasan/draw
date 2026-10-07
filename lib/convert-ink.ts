import {convertToExcalidrawElements} from '@excalidraw/excalidraw';
import type {ExcalidrawElement, NonDeleted} from '@excalidraw/excalidraw/element/types';
import {fitArrow, inkBounds, outline, type InkStroke, type ShapeKind} from './ink-geometry';
export type StrokeElement = NonDeleted<Extract<ExcalidrawElement, {type:'freedraw'|'line'|'arrow'}>>;
export const isInk = (e: ExcalidrawElement): e is StrokeElement => !e.isDeleted && (e.type === 'freedraw' || e.type === 'line');

export function convertInk(strokes: readonly StrokeElement[], kind: ShapeKind, direction?: string) {
  const {x,y,width,height}=inkBounds(strokes as readonly InkStroke[]);
  const source=strokes[0];
  const base = {x,y,width:Math.max(4,width),height:Math.max(4,height),strokeColor:source.strokeColor,strokeWidth:source.strokeWidth,strokeStyle:source.strokeStyle,opacity:source.opacity,roughness:source.roughness,backgroundColor:'transparent',customData:{inkToForm:true}};
  if (kind === 'arrow' || kind === 'double_arrow' || kind === 'line') {
    const {tail,tip} = fitArrow(strokes as readonly InkStroke[], direction, kind==='double_arrow');
    return convertToExcalidrawElements([{...base,type:kind==='line'?'line':'arrow',x:tail[0],y:tail[1],points:[[0,0],[tip[0]-tail[0],tip[1]-tail[1]]],startArrowhead:kind==='double_arrow'?'arrow':null,endArrowhead:kind==='line'?null:'arrow'}]);
  }
  if (kind === 'triangle' || kind === 'polygon') {
    const corners=outline(strokes as readonly InkStroke[],kind==='triangle'?3:undefined);
    if(corners.length<3)throw new Error('This sketch needs at least three corners.');
    const points=[...corners,corners[0]].map(p=>[p[0]-x,p[1]-y] as [number,number]);
    return convertToExcalidrawElements([{...base,type:'line',points,roundness:null}]);
  }
  return convertToExcalidrawElements([{...base,type:kind}]);
}
