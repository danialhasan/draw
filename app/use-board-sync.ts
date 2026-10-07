'use client';
import {useEffect,useRef,useState} from 'react';
import {CaptureUpdateAction,reconcileElements,restoreElements} from '@excalidraw/excalidraw';
import type {ExcalidrawImperativeAPI,SocketId} from '@excalidraw/excalidraw/types';
import type {ExcalidrawElement,OrderedExcalidrawElement} from '@excalidraw/excalidraw/element/types';
const signature=(e:ExcalidrawElement)=>`${e.version}:${e.versionNonce}`;
type Person={clientId:string;name:string;pointer?:{x:number;y:number;tool:'pointer'};selectedElementIds:Record<string,true>};
export function useBoardSync(boardId:string,api:ExcalidrawImperativeAPI|null){
  const [title,setTitle]=useState('Shared board'),[status,setStatus]=useState('Connecting…'),[people,setPeople]=useState<string[]>([]);
  const known=useRef(new Map<string,string>()),pointer=useRef<{x:number;y:number}|null>(null);
  const initialized=useRef(false),key=`ink-board:${boardId}`;
  function remember(elements:readonly ExcalidrawElement[]){
    // The first empty editor render must not overwrite a saved offline copy.
    if(!initialized.current)return;
    try{localStorage.setItem(key,JSON.stringify(elements));}catch{}
    if(elements.some(e=>known.current.get(e.id)!==signature(e)))setStatus('Saving…');
  }
  useEffect(()=>{
    if(!api)return;
    let stopped=false,timer:ReturnType<typeof setTimeout>;
    const clientId=crypto.randomUUID(),abort=new AbortController();
    try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved)&&saved.length)api.updateScene({elements:restoreElements(saved,null),captureUpdate:CaptureUpdateAction.NEVER});}catch{}
    initialized.current=true;
    async function sync(){
      if(stopped)return;
      try{
        const changed=api!.getSceneElementsIncludingDeleted().filter(e=>known.current.get(e.id)!==signature(e)).slice(0,100);
        const r=await fetch(`/api/boards/${boardId}/sync`,{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({clientId,elements:changed,pointer:pointer.current,selectedElementIds:api!.getAppState().selectedElementIds})});
        const d=await r.json() as {error?:string;title:string;elements:OrderedExcalidrawElement[];people:Person[]};
        if(!r.ok)throw new Error(d.error||'Could not sync');
        if(stopped)return;
        d.elements.forEach(e=>known.current.set(e.id,signature(e)));
        const local=api!.getSceneElementsIncludingDeleted(),byId=new Map(local.map(e=>[e.id,e]));
        const ordered=[...d.elements].sort((a,b)=>(a.index||'')<(b.index||'')?-1:(a.index||'')>(b.index||'')?1:0);
        const restored=restoreElements(ordered,null).map(e=>{const existing=byId.get(e.id);return existing&&signature(existing)===signature(e)?existing:e;});
        const merged=reconcileElements(local,restored as unknown as Parameters<typeof reconcileElements>[1],api!.getAppState());
        const changedScene=merged.length!==local.length||merged.some((e,i)=>e!==local[i]);
        // An unchanged poll must not replace local objects or disturb the editor's render/history caches.
        api!.updateScene({...changedScene?{elements:merged,captureUpdate:CaptureUpdateAction.NEVER}:{},collaborators:new Map(d.people.map(p=>[p.clientId as SocketId,{username:p.name,pointer:p.pointer,selectedElementIds:p.selectedElementIds,color:{background:'#dbeafe',stroke:'#2563eb'}}]))});
        setTitle(d.title);setPeople(d.people.map(p=>p.name));
        setStatus(merged.some(e=>known.current.get(e.id)!==signature(e))?'Saving…':'Saved');
        try{localStorage.setItem(key,JSON.stringify(merged));}catch{}
      }catch{if(!stopped)setStatus('Offline · retrying');}
      finally{if(!stopped)timer=setTimeout(sync,700);}
    }
    sync();return()=>{stopped=true;abort.abort();clearTimeout(timer);};
  },[api,boardId,key]);
  return {title,status,people,pointer,remember};
}
