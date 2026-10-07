'use client';
import {useEffect,useRef,useState} from 'react';
import {Excalidraw,CaptureUpdateAction,newElementWith} from '@excalidraw/excalidraw';
import type {ExcalidrawImperativeAPI} from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';
import {renderInk} from '@/lib/render-ink';
import {groupInk} from '@/lib/group-ink';
import {arrowHeadGap,canReplaceInk,shapeKinds,type ShapeKind} from '@/lib/ink-geometry';
import {convertInk,isInk,type StrokeElement} from '@/lib/convert-ink';
import {inkIdle} from '@/lib/ink-idle';
import {useBoardSync} from './use-board-sync';

type Recognition={kind:string;confidence:number|null;direction:string|null;refused:boolean;error?:string};
const labels:Record<ShapeKind,string>={rectangle:'Rectangle',ellipse:'Ellipse',triangle:'Triangle',diamond:'Diamond',polygon:'Polygon',arrow:'Arrow',double_arrow:'Double arrow',line:'Line'};

export default function Whiteboard({boardId,name}:{boardId:string;name:string}){
  const [api,setApi]=useState<ExcalidrawImperativeAPI|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [selectedInk,setSelectedInk]=useState(0);
  const active=useRef<AbortController|null>(null),gesture=useRef<string|null>(null),drawing=useRef(false);
  const recognizeRef=useRef<(strokes:StrokeElement[],signal:AbortSignal)=>Promise<void>>(async()=>{});
  const [idle]=useState(()=>inkIdle<StrokeElement>((strokes,signal)=>recognizeRef.current(strokes,signal)));
  useEffect(()=>()=>{idle.cancel();active.current?.abort();},[idle]);
  const {title,status,people,pointer,remember}=useBoardSync(boardId,api);

  function targetStrokes(){
    if(!api)return [];
    const selected=api.getAppState().selectedElementIds;
    const selectedAny=Object.values(selected).some(Boolean);
    return api.getSceneElements().filter(e=>isInk(e)&&(selectedAny?selected[e.id]:e.type==='freedraw')).map(e=>structuredClone(e)) as StrokeElement[];
  }

  function replace(strokes:StrokeElement[],kind:ShapeKind,direction?:string|null){
    if(!api)return false;
    const current=api.getSceneElementsIncludingDeleted();
    if(!canReplaceInk(strokes,current))return false;
    const shapes=convertInk(strokes,kind,direction||undefined),ids=new Set(strokes.map(e=>e.id));
    api.updateScene({elements:[...current.map(e=>ids.has(e.id)?newElementWith(e,{isDeleted:true}):e),...shapes],appState:{selectedElementIds:{}},captureUpdate:CaptureUpdateAction.IMMEDIATELY});
    return true;
  }

  async function recognize(strokes:StrokeElement[],signal:AbortSignal,automatic=false){
    if(!api||signal.aborted)return;
    strokes=strokes.filter(stroke=>canReplaceInk([stroke],api.getSceneElementsIncludingDeleted()));
    if(!strokes.length)return;
    // Include a nearby converted shaft/arrow when a later stroke adds another head.
    const ids=new Set(strokes.map(e=>e.id));
    const connectors=api.getSceneElements().filter(e=>!ids.has(e.id)&&(e.type==='arrow'||(e.type==='line'&&e.customData?.inkToForm===true))) as StrokeElement[];
    const added=new Map<string,StrokeElement>();
    for(const stroke of strokes){
      const nearest=connectors.map(e=>({element:e,gap:arrowHeadGap(stroke,e)})).sort((a,b)=>a.gap-b.gap)[0];
      if(nearest&&Number.isFinite(nearest.gap))added.set(nearest.element.id,structuredClone(nearest.element));
    }
    strokes=[...added.values(),...strokes];
    setBusy(true);
    const groups=groupInk(strokes),decisions:{strokes:StrokeElement[];kind:ShapeKind;direction:string|null}[]=[];
    let converted=0,changed=0,unknown=0,errorMessage='';
    try{
      for(const [index,group] of groups.entries()){
        if(signal.aborted)return;
        setMessage(`Reading sketch ${index+1} of ${groups.length}…`);
        const canvas=await renderInk(group),image=canvas.toDataURL('image/png');
        if(signal.aborted)return;
        try{
          const r=await fetch(`/api/boards/${boardId}/decide`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image}),signal:AbortSignal.any([signal,AbortSignal.timeout(25000)])});
          const d=await r.json() as Recognition;
          if(signal.aborted)return;
          if(!r.ok)throw new Error(d.error||'Recognition is unavailable.');
          if(shapeKinds.includes(d.kind as ShapeKind)&&!d.refused){
            decisions.push({strokes:group,kind:d.kind as ShapeKind,direction:d.direction});
            continue;
          }
        }catch(e){if(signal.aborted)return;errorMessage=e instanceof Error?e.message:'Recognition is unavailable.';}
        unknown++;
      }
      if(signal.aborted)return;
      for(const d of decisions){if(replace(d.strokes,d.kind,d.direction))converted++;else changed++;}
      setMessage(errorMessage||`${converted} converted${unknown?` · ${unknown} left as ink`:''}${changed?` · ${changed} changed while reading; kept`:''}`);
      if(!automatic)api.setActiveTool({type:'selection'});
    }catch(e){if(!signal.aborted)setMessage(e instanceof Error?e.message:'Could not read the ink. It has been kept.');}
    finally{if(!signal.aborted)setBusy(false);}
  }
  recognizeRef.current=async(strokes,signal)=>{
    active.current?.abort();
    await recognize(strokes,signal,true);
  };

  function tidy(){
    if(!api)return;
    const strokes=targetStrokes();
    if(!strokes.length){setMessage('Select some ink, or draw with Sketch first.');return;}
    idle.cancel();active.current?.abort();
    const controller=new AbortController();active.current=controller;
    void recognize(strokes,controller.signal);
  }

  function forceSelected(kind:ShapeKind){
    const strokes=targetStrokes();
    if(!selectedInk||!strokes.length)return;
    try{setMessage(replace(strokes,kind)?`Converted to ${labels[kind].toLowerCase()}. Undo restores the ink.`:'The ink changed. Select it and try again.');}
    catch(e){setMessage((e as Error).message);}
  }

  return <main className="board-page">
    <header className="board-header">
      <a href="/" className="wordmark">Ink → Form</a><strong>{title}</strong>
      <span className="save-status" role="status">{status}</span>
      <span title={[name,...people].join(', ')}>{people.length+1} here</span>
      <button onClick={async()=>{try{await navigator.clipboard.writeText(location.href);setMessage('Board link copied. Anyone with the link can join.');}catch{setMessage(location.href);}}}>Copy link</button>
    </header>
    <div className="canvas">
      <Excalidraw excalidrawAPI={setApi} name={title} isCollaborating objectsSnapModeEnabled
        initialData={{appState:{currentItemStrokeColor:'#2563eb',viewBackgroundColor:'#fafbfc'}}}
        onPointerUpdate={p=>{pointer.current=p.pointer;}}
        onPointerDown={()=>{drawing.current=true;gesture.current=null;idle.down();active.current?.abort();setBusy(false);}}
        onPointerUp={()=>{const id=gesture.current||api?.getAppState().newElement?.id;drawing.current=false;gesture.current=null;queueMicrotask(()=>{const stroke=api?.getSceneElements().find(e=>e.id===id&&e.type==='freedraw');idle.up(stroke?structuredClone(stroke) as StrokeElement:undefined);});}}
        onChange={(elements,state)=>{remember(elements);if(drawing.current&&state.newElement?.type==='freedraw')gesture.current=state.newElement.id;setSelectedInk(elements.filter(e=>isInk(e)&&state.selectedElementIds[e.id]).length);}}
        UIOptions={{tools:{image:false},canvasActions:{loadScene:false,saveToActiveFile:false}}}/>

    </div>
    <footer className="board-footer">
      <span className="board-instructions">Double-click to write · Ink recognized after a 500 ms pause</span>
      <span className="recognition-status" role="status">{message}</span>
      {selectedInk>0&&<select aria-label="Convert selected ink to" value="" disabled={busy} onChange={e=>forceSelected(e.target.value as ShapeKind)}><option value="" disabled>Convert to…</option>{shapeKinds.map(kind=><option key={kind} value={kind}>{labels[kind]}</option>)}</select>}
      <button onClick={()=>{api?.setActiveTool({type:'freedraw'});setMessage('Draw a shape. Recognition starts 500 ms after you lift your pen.');}}>Sketch</button>
      <button className="blue-button" disabled={busy||!api} onClick={tidy}>{busy?'Reading…':selectedInk?'Tidy selected ink':'Tidy ink'}</button>
    </footer>
  </main>;
}
