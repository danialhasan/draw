import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {UPSERT_ELEMENT,validateElements} from '../lib/board-data.ts';
test('independent edits survive and stale updates cannot resurrect deleted objects',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE elements(board_id TEXT,id TEXT,version INTEGER,nonce INTEGER,data TEXT,PRIMARY KEY(board_id,id))');const put=db.prepare(UPSERT_ELEMENT);const write=(id:string,v:number,n:number,deleted=false)=>put.run('room',id,v,n,JSON.stringify({id,version:v,isDeleted:deleted}));
 write('a',1,20);write('b',1,20);write('a',3,10,true);write('a',2,1);write('b',2,30);write('b',2,40);
 const rows=db.prepare('SELECT * FROM elements ORDER BY id').all();assert.equal(rows.length,2);assert.equal(JSON.parse(rows[0].data as string).isDeleted,true);assert.equal(rows[1].nonce,30);write('b',2,5);assert.equal(db.prepare("SELECT nonce FROM elements WHERE id='b'").get()!.nonce,5);
});
test('invalid stroke batches are rejected before writes',()=>{assert.throws(()=>validateElements([{id:'x',type:'freedraw',version:1,versionNonce:1,isDeleted:false,x:0,y:0,points:[[NaN,0]]}]));assert.throws(()=>validateElements(Array(101).fill({})));});
