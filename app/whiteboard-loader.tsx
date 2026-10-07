'use client';
import {useEffect,useState,type ComponentType} from 'react';
export default function WhiteboardLoader(props:{boardId:string;name:string}){const [Board,setBoard]=useState<ComponentType<typeof props>|null>(null),[error,setError]=useState(false);useEffect(()=>{import('./whiteboard').then(m=>setBoard(()=>m.default)).catch(()=>setError(true));},[]);return Board?<Board {...props}/>:<main className="loading-board">{error?<p>The whiteboard could not load. <a href="">Reload</a></p>:<p>Opening your whiteboard…</p>}</main>;}
