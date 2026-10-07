import {db,user,reply,checkOrigin,readJSON,failure} from '@/lib/server';
export async function GET(){try{const u=await user();const rows=await db().prepare('SELECT b.id,b.title,b.updated_at FROM boards b JOIN members m ON m.board_id=b.id WHERE m.user_id=? ORDER BY b.updated_at DESC LIMIT 50').bind(u.userId).all();return reply({boards:rows.results});}catch(e){return failure(e);}}
export async function POST(req:Request){try{checkOrigin(req);const u=await user();const input=await readJSON(req,1000);const title=typeof input.title==='string'?input.title.trim().slice(0,100):'Untitled board';const id=crypto.randomUUID(),now=Date.now();await db().batch([
  db().prepare('INSERT INTO boards(id,title,owner,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id,title||'Untitled board',u.userId,now,now),
  db().prepare('INSERT INTO members(board_id,user_id,joined_at) VALUES(?,?,?)').bind(id,u.userId,now),
]);return reply({id,title},201);}catch(e){return failure(e);}}
