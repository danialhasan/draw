import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fitArrow,worldPoints,outline,canReplaceInk,type InkStroke} from '../lib/ink-geometry.ts';
const arrow=JSON.parse(readFileSync(new URL('./fixtures/offset-arrow.json',import.meta.url),'utf8')) as InkStroke[];
test('actual failed arrow uses the head tip beyond the shaft, not the end of the shaft',()=>{
  const fit=fitArrow(arrow);assert.ok(fit.tip[0]>200);assert.ok(fit.tail[0]<1);assert.ok(fit.tip[1]<15);
  const reverse=arrow.map(s=>({...s,points:[...s.points].reverse()}));assert.deepEqual(fitArrow(reverse),fit);
});
test('arrow fitting preserves direction after rotation and translation',()=>{
  const moved=arrow.map(s=>({...s,x:s.x+400,y:s.y+200}));const a=fitArrow(arrow),b=fitArrow(moved);assert.ok(Math.abs(b.tip[0]-a.tip[0]-400)<.001);assert.ok(Math.abs(b.tail[1]-a.tail[1]-200)<.001);
  const p=worldPoints({id:'r',x:0,y:0,width:100,height:0,angle:Math.PI/2,points:[[0,0],[100,0]]});assert.ok(Math.abs(p[0][0]-50)<.001);assert.ok(Math.abs(p[0][1]+50)<.001);assert.ok(Math.abs(p[1][1]-50)<.001);
});
test('slanted quadrilateral remains a four-corner polygon',()=>{const p=outline([{id:'p',x:0,y:0,width:200,height:180,angle:0,points:[[0,10],[140,0],[200,80],[20,180],[0,10]]}]);assert.equal(p.length,4);assert.ok(p.some(p=>p[0]===200&&p[1]===80));});
test('conversion cannot erase an object edited or deleted while recognition is running',()=>{
 const old=[{id:'a',version:3,versionNonce:10}];assert.equal(canReplaceInk(old,[{...old[0],isDeleted:false}]),true);assert.equal(canReplaceInk(old,[{...old[0],version:4,isDeleted:false}]),false);assert.equal(canReplaceInk(old,[{...old[0],isDeleted:true}]),false);assert.equal(canReplaceInk(old,[]),false);
});
test('an immutable recognition snapshot catches in-place editor mutations',()=>{const current={id:'a',version:1,versionNonce:2,isDeleted:false};const snapshot=structuredClone(current);current.version++;assert.equal(canReplaceInk([snapshot],[current]),false);});

test('the saved double-headed arrow spans both actual tips, including the rounded left head',()=>{
  const strokes=JSON.parse(readFileSync(new URL('./fixtures/double-arrow.json',import.meta.url),'utf8')) as InkStroke[];
  for(const variant of [strokes,[...strokes].reverse().map(s=>({...s,points:[...s.points].reverse()}))]){
    const ends=fitArrow(variant,undefined,true);const ordered=[ends.tail,ends.tip].sort((a,b)=>a[0]-b[0]);
    assert.ok(ordered[0][0]<245,'left endpoint must include the head beyond the shaft');
    assert.ok(ordered[1][0]>440,'right endpoint must include the head beyond the shaft');
    assert.ok(Math.abs(ordered[1][1]-ordered[0][1])<20,'a horizontal bidirectional arrow must remain horizontal');
  }
});
