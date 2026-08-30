import test from 'node:test';
import assert from 'node:assert/strict';
import { defineDevtoolsConfig, initialState, validateState, encodeState, decodeState, stateUrl, recipe } from '../dist/core.js';
const config=defineDevtoolsConfig({project:'fixture',metadata:{route:'/x'},families:[{key:'card',label:'Card',variants:[{name:'a'},{name:'b'}]}],controls:[{type:'range',key:'gap',label:'Gap',min:0,max:20,default:4,effect:{scope:'grid',variable:'--fd-gap'}},{type:'toggle',key:'featured',label:'Featured',default:false,effect:{scope:'card',attribute:'featured'}}]});
test('defaults and fail-closed state',()=>{const s=initialState(config);assert.equal(s.values.gap,4);assert.equal(validateState(config,{values:{gap:999,featured:'yes'},families:{card:'unknown'}}).values.gap,4);});
test('URL codec is reproducible and preserves params',()=>{const s={families:{card:'b'},values:{gap:8,featured:true}};const encoded=encodeState(config,s);assert.deepEqual(decodeState(config,encoded),s);const u=stateUrl(config,s,'https://example.test/?utm=x');assert.equal(new URL(u).searchParams.get('utm'),'x');assert.ok(u.includes('fd='));});
test('recipe is JSON',()=>{assert.equal(JSON.parse(recipe(config,initialState(config))).project,'fixture');});
test('invalid config rejects', () => {
  assert.throws(() => defineDevtoolsConfig({ project: 'x', families: [{ key: 'bad key', variants: [] }] }));
  assert.throws(() => defineDevtoolsConfig({
    project: 'x',
    families: [{ key: 'card', label: 'Card', variants: [{ name: 'default' }] }],
    controls: [{
      type: 'range', key: 'gap', label: 'Gap', min: 0, max: 10, default: Number.NaN,
      effect: { scope: 'grid', variable: '--gap' },
    }],
  }));
});
