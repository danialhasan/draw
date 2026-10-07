import {test} from 'node:test';
import assert from 'node:assert/strict';
import {arrowHeadGap,type InkStroke} from '../lib/ink-geometry.ts';
const shaft:InkStroke={id:'shaft',x:100,y:200,width:200,height:0,angle:0,points:[[0,0],[200,0]]};
const head:InkStroke={id:'head',x:130,y:175,width:30,height:50,angle:0,points:[[0,0],[-30,25],[0,50]]};
test('a later second head rejoins the existing connector, regardless of direction',()=>{
  assert.equal(arrowHeadGap(head,shaft),0);
  assert.equal(arrowHeadGap({...head,x:270,points:[[0,0],[30,25],[0,50]]},shaft),0);
  assert.equal(arrowHeadGap(head,{...shaft,points:[[200,0],[0,0]]}),0);
});
test('unrelated marks and large shapes do not absorb a neighboring connector',()=>{
  assert.equal(arrowHeadGap({...head,x:230},shaft),Infinity);
  assert.equal(arrowHeadGap({...head,width:300,points:[[0,0],[-30,25],[270,300]]},shaft),Infinity);
  assert.equal(arrowHeadGap(head,{...shaft,points:[[0,0],[100,20],[200,0]]}),Infinity);
});
