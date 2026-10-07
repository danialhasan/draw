import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inkIdle} from '../lib/ink-idle.ts';

test('recognition waits 500 ms after pen-up and resets for another stroke',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const calls:string[][]=[];const queue=inkIdle<{id:string}>(async strokes=>{calls.push(strokes.map(s=>s.id));});
  queue.down();queue.up({id:'shaft'});t.mock.timers.tick(499);assert.equal(calls.length,0);
  queue.down();t.mock.timers.tick(2000);assert.equal(calls.length,0);
  queue.up({id:'head'});t.mock.timers.tick(499);assert.equal(calls.length,0);
  t.mock.timers.tick(1);assert.deepEqual(calls,[['shaft','head']]);await Promise.resolve();queue.cancel();
});
test('continuing a sketch aborts an in-flight decision and retries the whole gesture',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const calls:{ids:string[];signal:AbortSignal;finish:()=>void}[]=[];
  const queue=inkIdle<{id:string}>((strokes,signal)=>new Promise<void>(finish=>calls.push({ids:strokes.map(s=>s.id),signal,finish})));
  queue.down();queue.up({id:'a'});t.mock.timers.tick(500);assert.equal(calls.length,1);
  queue.down();assert.equal(calls[0].signal.aborted,true);calls[0].finish();await Promise.resolve();
  queue.up({id:'b'});t.mock.timers.tick(500);assert.deepEqual(calls[1].ids,['a','b']);
  calls[1].finish();await Promise.resolve();queue.cancel();
});
test('cancelled or completed ink is not recognized again without a new local stroke',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let calls=0;
  const queue=inkIdle<{id:string}>(async()=>{calls++;});
  queue.down();queue.up({id:'a'});queue.cancel();t.mock.timers.tick(1000);assert.equal(calls,0);
  queue.down();queue.up({id:'b'});t.mock.timers.tick(500);await Promise.resolve();assert.equal(calls,1);
  queue.down();queue.up();t.mock.timers.tick(5000);assert.equal(calls,1);queue.cancel();
});
