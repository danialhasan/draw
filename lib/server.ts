import {cookies} from 'next/headers';
import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {validId} from './board-data';
export function db(){if(!env.DB)throw new Error('Board storage is unavailable.');return env.DB;}
export function reply(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store'}});}
export async function user(){
  const signedIn=await getChatGPTUser();if(signedIn)return signedIn;
  const jar=await cookies();let id=jar.get('ink-guest')?.value;
  if(!id||!validId(id)){id=crypto.randomUUID();jar.set('ink-guest',id,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:31_536_000});}
  return {userId:`guest:${id}`,displayName:`Guest ${id.slice(0,4)}`,email:'',fullName:null};
}
export function checkOrigin(req:Request){if(req.headers.get('origin')!==new URL(req.url).origin)throw new Error('This request must come from the whiteboard.');}
export async function readJSON(req:Request,max=1_600_000){
  const reader=req.body?.getReader();if(!reader)throw new Error('Missing request body.');let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error('The update is too large.');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
export async function board(id:string){if(!validId(id))throw new Error('Board not found.');const b=await db().prepare('SELECT id,title,owner FROM boards WHERE id=?').bind(id).first<{id:string;title:string;owner:string}>();if(!b)throw new Error('Board not found.');return b;}
export function failure(error:unknown){const message=error instanceof Error?error.message:'The board could not be updated.';const safe=['Sign in','Board not found','This request','Send up to','An object','Image uploads','A text','Invalid stroke','Missing request','The update'];return reply({error:safe.some(p=>message.startsWith(p))?message:'The server could not save this update. Your local changes are kept.'},message.startsWith('Sign in')?401:message==='Board not found.'?404:400);}
