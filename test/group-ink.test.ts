import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupInk} from '../lib/group-ink.ts';
test('separate screenshot shapes are separate gestures while open polygon pieces stay together',()=>{const a={x:170,y:280,width:115,height:145},b={x:330,y:245,width:200,height:100},c={x:350,y:270,width:180,height:160};assert.deepEqual(groupInk([a,b,c]),[[a],[b,c]]);});
test('offset arrowhead stays with shaft',()=>{assert.equal(groupInk([{x:26,y:263,width:263,height:0},{x:192,y:199,width:117,height:132}]).length,1);});
