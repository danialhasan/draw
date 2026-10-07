import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeRequest,interpret} from '../lib/decision.mjs';
test('recognition request contains one native image without artificial endpoint markers',()=>{const r=makeRequest('data:image/png;base64,AAAA');assert.equal(r.input[0].content[1].type,'input_image');assert.equal(r.questions.some(q=>q.name==='arrow_head'),false);assert.equal(r.questions[0].choices.some(c=>c.value==='polygon'),true);assert.throws(()=>makeRequest('https://example.com/image.png'));});
test('refusals and malformed scores keep original ink',()=>{assert.equal(interpret({answers:[{name:'gesture',type:'refusal'}]}).refused,true);assert.throws(()=>interpret({answers:[{name:'gesture',type:'choice',choice:'arrow',confidence:NaN}]}));});
