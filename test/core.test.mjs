import test from 'node:test';
import assert from 'node:assert/strict';
import { defineDevtoolsConfig, initialState, validateState, encodeState, decodeState, stateUrl, recipe, changes, resetBaseline } from '../dist/core.js';
const config=defineDevtoolsConfig({project:'fixture',metadata:{route:'/x'},families:[{key:'card',label:'Card',variants:[{name:'a'},{name:'b'}]}],controls:[{type:'range',key:'gap',label:'Gap',min:0,max:20,default:4,effect:{scope:'grid',variable:'--fd-gap'}},{type:'toggle',key:'featured',label:'Featured',default:false,effect:{scope:'card',attribute:'featured'}}]});
test('defaults and fail-closed state',()=>{const s=initialState(config);assert.equal(s.values.gap,4);assert.equal(validateState(config,{values:{gap:999,featured:'yes'},families:{card:'unknown'}}).values.gap,4);});
test('URL codec is reproducible and preserves params',()=>{const s={families:{card:'b'},values:{gap:8,featured:true}};const encoded=encodeState(config,s);assert.deepEqual(decodeState(config,encoded),s);const u=stateUrl(config,s,'https://example.test/?utm=x');assert.equal(new URL(u).searchParams.get('utm'),'x');assert.ok(u.includes('fd='));});
test('recipe is JSON',()=>{assert.equal(JSON.parse(recipe(config,initialState(config))).project,'fixture');});
test('targets, labeled options and fail-closed object validation', () => {
  const targetConfig = defineDevtoolsConfig({ project: 'targets', targets: [{ key: 'hero', label: 'Hero', kind: 'section' }], families: [{ key: 'layout', label: 'Layout', target: 'hero', variants: [{ name: 'base', defaults: { density: 'compact' } }, { name: 'wide' }] }], controls: [{ type: 'select', key: 'density', label: 'Density', options: [{ value: 'compact', label: 'Compact' }, 'roomy'], default: 'roomy', target: 'hero', classification: 'token', effect: { scope: 'hero', attribute: 'density' } }] });
  assert.equal(initialState(targetConfig).values.density, 'compact');
  assert.equal(changes(targetConfig, initialState(targetConfig)).count, 0);
  const modified = validateState(targetConfig, { families: { layout: 'wide' }, values: { density: 'compact' } });
  assert.equal(changes(targetConfig, modified).count, 1);
  assert.equal(changes(targetConfig, resetBaseline(targetConfig, modified, 'hero')).count, 0);
  const variantConfig = defineDevtoolsConfig({ project: 'variants', targets: [{ key: 'hero', label: 'Hero', kind: 'section' }], families: [{ key: 'family', label: 'Family', target: 'hero', variants: [{ name: 'base' }, { name: 'custom', defaults: { density: 'compact' } }] }], controls: [{ type: 'select', key: 'density', label: 'Density', options: ['roomy', 'compact'], default: 'roomy', effect: { scope: 'hero', attribute: 'density' } }] });
  const stale = validateState(variantConfig, { families: { family: 'custom' }, values: { density: 'compact' } });
  assert.equal(changes(variantConfig, resetBaseline(variantConfig, stale, 'hero')).count, 0);
  for (const options of [[{ label: 'Missing value' }], [{ value: '', label: 'Empty' }], [{ value: 'x' }]]) assert.throws(() => defineDevtoolsConfig({ project: 'x', families: [{ key: 'f', label: 'F', variants: [{ name: 'a' }] }], controls: [{ type: 'select', key: 's', label: 'S', options, default: 'x', effect: { scope: 'f', attribute: 'x' } }] }));
});

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
