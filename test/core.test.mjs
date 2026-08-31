import test from 'node:test';
import assert from 'node:assert/strict';
import { defineDevtoolsConfig, initialState, validateState, encodeState, decodeState, stateUrl, recipe, changes, changesJson, agentBrief, resetBaseline, recipeRegistry, safeRoute } from '../dist/core.js';
const config=defineDevtoolsConfig({project:'fixture',metadata:{route:'/x'},families:[{key:'card',label:'Card',variants:[{name:'a'},{name:'b'}]}],controls:[{type:'range',key:'gap',label:'Gap',min:0,max:20,default:4,effect:{scope:'grid',variable:'--fd-gap'}},{type:'toggle',key:'featured',label:'Featured',default:false,effect:{scope:'card',attribute:'featured'}}]});
test('defaults and fail-closed state',()=>{const s=initialState(config);assert.equal(s.values.gap,4);assert.equal(validateState(config,{values:{gap:999,featured:'yes'},families:{card:'unknown'}}).values.gap,4);});
test('URL codec is reproducible and preserves params',()=>{const s={families:{card:'b'},values:{gap:8,featured:true}};const encoded=encodeState(config,s);assert.deepEqual(decodeState(config,encoded),s);const u=stateUrl(config,s,'https://example.test/?utm=x');assert.equal(new URL(u).searchParams.get('utm'),'x');assert.ok(u.includes('fd='));});
test('recipe is JSON',()=>{assert.equal(JSON.parse(recipe(config,initialState(config))).project,'fixture');});
test('safe routes exclude query, fragment, and credentials from every handoff output', () => {
  assert.equal(safeRoute('https://user:secret@example.test/design?fd=secret#changes'), '/design');
  assert.equal(safeRoute('/design#inspect?x=y'), '/design');
  const routeConfig = defineDevtoolsConfig({ project: 'routes', metadata: { route: 'https://user:secret@example.test/design?token=private#changes', locale: 'en' }, families: [{ key: 'card', label: 'Card', variants: [{ name: 'a' }, { name: 'b' }] }] });
  const changed = validateState(routeConfig, { families: { card: 'b' } });
  for (const output of [changes(routeConfig, changed), JSON.parse(changesJson(routeConfig, changed)), agentBrief(routeConfig, changed)]) {
    const text = typeof output === 'string' ? output : JSON.stringify(output);
    assert.equal(text.includes('secret'), false);
    assert.equal(text.includes('token='), false);
    if (typeof output !== 'string') assert.equal(output.metadata?.route, '/design');
  }
  assert.equal(routeConfig.metadata?.route, 'https://user:secret@example.test/design?token=private#changes');
  assert.deepEqual(changed, { families: { card: 'b' }, values: {} });
});
test('targets, labeled options and fail-closed object validation', () => {
  const targetConfig = defineDevtoolsConfig({ project: 'targets', targets: [{ key: 'hero', label: 'Hero', kind: 'section' }], families: [{ key: 'layout', label: 'Layout', target: 'hero', variants: [{ name: 'base', defaults: { density: 'compact' } }, { name: 'wide' }] }], controls: [{ type: 'select', key: 'density', label: 'Density', options: [{ value: 'compact', label: 'Compact' }, 'roomy'], default: 'roomy', target: 'hero', classification: 'token', effect: { scope: 'hero', attribute: 'density' } }] });
  assert.equal(initialState(targetConfig).values.density, 'compact');
  assert.equal(changes(targetConfig, initialState(targetConfig)).count, 0);
  const modified = validateState(targetConfig, { families: { layout: 'wide' }, values: { density: 'compact' } });
  const targetChanges = changes(targetConfig, modified);
  assert.equal(targetChanges.count, 1);
  assert.deepEqual(targetChanges.changes[0], { key: 'layout', label: 'Layout', kind: 'family', from: 'base', to: 'wide', target: 'hero', targetKind: 'section' });
  assert.equal(JSON.parse(changesJson(targetConfig, modified)).count, 1);
  assert.match(agentBrief(targetConfig, modified), /Layout.*`base` → `wide`/);
  const tokenModified = validateState(targetConfig, { families: { layout: 'base' }, values: { density: 'roomy' } });
  assert.deepEqual(changes(targetConfig, tokenModified).changes[0], { key: 'density', label: 'Density', kind: 'control', from: 'compact', to: 'roomy', target: 'hero', targetKind: 'section', classification: 'token' });
  assert.equal(changes(targetConfig, resetBaseline(targetConfig, modified, 'hero')).count, 0);
  const variantConfig = defineDevtoolsConfig({ project: 'variants', targets: [{ key: 'hero', label: 'Hero', kind: 'section' }], families: [{ key: 'family', label: 'Family', target: 'hero', variants: [{ name: 'base' }, { name: 'custom', defaults: { density: 'compact' } }] }], controls: [{ type: 'select', key: 'density', label: 'Density', options: ['roomy', 'compact'], default: 'roomy', effect: { scope: 'hero', attribute: 'density' } }] });
  const stale = validateState(variantConfig, { families: { family: 'custom' }, values: { density: 'compact' } });
  assert.equal(changes(variantConfig, resetBaseline(variantConfig, stale, 'hero')).count, 0);
  for (const options of [[{ label: 'Missing value' }], [{ value: '', label: 'Empty' }], [{ value: 'x' }]]) assert.throws(() => defineDevtoolsConfig({ project: 'x', families: [{ key: 'f', label: 'F', variants: [{ name: 'a' }] }], controls: [{ type: 'select', key: 's', label: 'S', options, default: 'x', effect: { scope: 'f', attribute: 'x' } }] }), /Invalid devtools config/);
  assert.throws(() => defineDevtoolsConfig({ project: 'x', targets: [{ key: 'hero', label: 'Hero', kind: 'section' }], families: [{ key: 'f', label: 'F', target: 'missing', variants: [{ name: 'a' }] }] }), /family target/);
  assert.throws(() => defineDevtoolsConfig({ project: 'x', families: [{ key: 'f', label: 'F', variants: [{ name: 'a' }] }], controls: [{ type: 'toggle', key: 't', label: 'T', target: 'missing', default: false, effect: { scope: 'f', attribute: 't' } }] }), /control target/);
  assert.equal(defineDevtoolsConfig({ project: 'legacy', families: [{ key: 'f', label: 'F', variants: [{ name: 'a' }] }] }).targets, undefined);
});

test('Compose uses only explicit, existing registrations', () => {
  const config = defineDevtoolsConfig({ project: 'compose', families: [{ key: 'layout', label: 'Layout', variants: [{ name: 'base' }] }, { key: 'hidden-family', label: 'Hidden', variants: [{ name: 'base' }] }], controls: [{ type: 'toggle', key: 'visible', label: 'Visible', default: false, effect: { scope: 'x', attribute: 'visible' } }, { type: 'toggle', key: 'hidden-control', label: 'Hidden', default: false, effect: { scope: 'x', attribute: 'hidden' } }], recipes: [{ key: 'known', label: 'Known', state: {} }], compose: { recipes: ['known'], families: ['layout'], controls: ['visible'] } });
  assert.deepEqual(recipeRegistry(config).map((item) => item.key), ['known']);
  assert.deepEqual(config.compose, { recipes: ['known'], families: ['layout'], controls: ['visible'] });
  assert.throws(() => defineDevtoolsConfig({ project: 'compose', families: [{ key: 'layout', label: 'Layout', variants: [{ name: 'base' }] }], compose: { families: ['missing'] } }), /compose family/);
  assert.throws(() => defineDevtoolsConfig({ project: 'compose', families: [{ key: 'layout', label: 'Layout', variants: [{ name: 'base' }] }], compose: { recipes: ['missing'] } }), /compose recipe/);
});

test('invalid config rejects', () => {
  assert.throws(() => defineDevtoolsConfig({ project: 'x', families: [{ key: 'bad key', variants: [] }] }));
  assert.throws(() => defineDevtoolsConfig({ project: 'x', families: [{ key: 'f', label: 'F', variants: [{ name: 'a' }] }], controls: [{ type: 'toggle', key: 't', label: 'T', default: false, effect: { scope: ['f'], attribute: 't' } }] }), /effect scope/);
  assert.throws(() => defineDevtoolsConfig({ project: 'x', families: [{ key: 'f', label: 'F', variants: [{ name: 'a' }] }], controls: [{ type: 'range', key: 'r', label: 'R', min: 0, max: 10, step: 3, default: 2, effect: { scope: 'f', variable: '--r' } }] }), /range/);
  const stepped = defineDevtoolsConfig({ project: 'x', families: [{ key: 'f', label: 'F', variants: [{ name: 'a' }] }], controls: [{ type: 'range', key: 'r', label: 'R', min: 0, max: 10, step: 3, default: 3, effect: { scope: 'f', variable: '--r' } }] });
  assert.equal(validateState(stepped, { families: { f: 'a' }, values: { r: 2 } }).values.r, 3);
  assert.throws(() => defineDevtoolsConfig({
    project: 'x',
    families: [{ key: 'card', label: 'Card', variants: [{ name: 'default' }] }],
    controls: [{
      type: 'range', key: 'gap', label: 'Gap', min: 0, max: 10, default: Number.NaN,
      effect: { scope: 'grid', variable: '--gap' },
    }],
  }));
});
