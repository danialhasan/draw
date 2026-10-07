import {db,user,board,reply,checkOrigin,readJSON,failure} from '@/lib/server';
import {validateElements,UPSERT_ELEMENT,validId} from '@/lib/board-data';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    checkOrigin(req);const u=await user();const {id}=await params;const b=await board(id);const input=await readJSON(req);
    if(typeof input.clientId!=='string'||!validId(input.clientId))throw new Error('Invalid stroke session.');
    const changes=validateElements(input.elements||[]);const now=Date.now();
    const count=await db().prepare('SELECT count(*) n FROM elements WHERE board_id=?').bind(id).first<{n:number}>();
    if((count?.n||0)>2000&&changes.some(e=>e.version===1))return reply({error:'This board is full. Create another board to keep working.'},413);
    const pointer=input.pointer&&Number.isFinite(input.pointer.x)&&Number.isFinite(input.pointer.y)?{x:input.pointer.x,y:input.pointer.y,tool:'pointer'}:undefined;
    const selection=input.selectedElementIds&&typeof input.selectedElementIds==='object'?Object.fromEntries(Object.entries(input.selectedElementIds).filter(([k,v])=>/^[\w-]{1,80}$/.test(k)&&v===true).slice(0,100)):{};
    await db().batch([
      db().prepare('INSERT INTO members(board_id,user_id,joined_at) VALUES(?,?,?) ON CONFLICT DO NOTHING').bind(id,u.userId,now),
      ...changes.map(e=>db().prepare(UPSERT_ELEMENT).bind(id,e.id,e.version,e.versionNonce,JSON.stringify(e))),
      ...(changes.length?[db().prepare('UPDATE boards SET updated_at=? WHERE id=?').bind(now,id)]:[]),
      db().prepare('INSERT INTO presence(board_id,client_id,user_id,name,data,seen_at) VALUES(?,?,?,?,?,?) ON CONFLICT(board_id,client_id) DO UPDATE SET user_id=excluded.user_id,name=excluded.name,data=excluded.data,seen_at=excluded.seen_at').bind(id,input.clientId,u.userId,u.fullName||u.displayName.split('@')[0],JSON.stringify({pointer,selectedElementIds:selection,button:input.button==='down'?'down':'up'}),now),
      db().prepare('DELETE FROM presence WHERE board_id=? AND seen_at<?').bind(id,now-60000),
    ]);
    const [elements,people]=await Promise.all([
      db().prepare('SELECT data FROM elements WHERE board_id=?').bind(id).all<{data:string}>(),
      db().prepare('SELECT client_id,name,data FROM presence WHERE board_id=? AND seen_at>? AND client_id<>?').bind(id,now-12000,input.clientId).all<{client_id:string;name:string;data:string}>(),
    ]);
    return reply({title:b.title,elements:elements.results.map(e=>JSON.parse(e.data)),people:people.results.map(p=>({clientId:p.client_id,name:p.name,...JSON.parse(p.data)}))});
  }catch(e){return failure(e);}
}
