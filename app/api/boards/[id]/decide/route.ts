import {env} from 'cloudflare:workers';
import {db,user,board,reply,checkOrigin,readJSON,failure} from '@/lib/server';
import {makeRequest,interpret,estimateCost,ENDPOINT} from '@/lib/decision.mjs';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    checkOrigin(req);const u=await user();const {id}=await params;await board(id);
    const input=await readJSON(req);const payload=makeRequest(input.image);
    const key=env.OPENAI_API_KEY||process.env.OPENAI_API_KEY;
    if(!key)return reply({error:'Sketch recognition is not connected yet. Drawing and collaboration still work.'},503);
    const day=new Date().toISOString().slice(0,10);
    const reservation=await db().prepare('INSERT INTO decision_usage(user_id,day,calls) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET calls=calls+1 WHERE calls<100 RETURNING calls').bind(`board:${id}`,day).first();
    if(!reservation)return reply({error:'This board has used today’s 100 sketch recognitions. The normal drawing tools still work.'},429);
    const start=performance.now();
    const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
    if(!response.ok)return reply({error:response.status===429?'OpenAI reported a rate or credit limit. Your ink is kept.':response.status===401?'The recognition key needs to be renewed. Your ink is kept.':`Recognition returned HTTP ${response.status}. Your ink is kept.`},502);
    const data=await response.json() as Parameters<typeof interpret>[0];
    return reply({...interpret(data),apiMs:Math.round(performance.now()-start),estimatedUsd:estimateCost(data.usage)});
  }catch(e){if(e instanceof Error&&e.name==='TimeoutError')return reply({error:'Recognition took too long. Your ink is kept; try again.'},504);return failure(e);}
}
