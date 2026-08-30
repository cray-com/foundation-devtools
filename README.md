# Foundation Devtools

`@cray-com/foundation-devtools` ist ein frameworkfreies, neutrales Entwicklungswerkzeug zum Vergleichen und Abstimmen von Website-Varianten auf der echten Seite. Es enthält weder Renderer noch Design-Tokens.

## Installation

```bash
npm install --save-dev https://github.com/cray-com/foundation-devtools/releases/download/v0.1.1/cray-com-foundation-devtools-0.1.1.tgz
```

## Astro

Der Adapter wird ausschließlich im Development-Build eingebunden:

```astro
---
import FoundationDevtools from '@cray-com/foundation-devtools/astro'
import { defineDevtoolsConfig } from '@cray-com/foundation-devtools'
const config = defineDevtoolsConfig({
  project: 'astro-foundation',
  metadata: { fixture: 'listing', route: '/projects', locale: 'en' },
  families: [{
    key: 'card', label: 'Card',
    effect: { scope: 'card', attribute: 'card-variant' },
    variants: [{ name: 'default' }, { name: 'compact' }],
  }],
  controls: [{ type: 'range', key: 'grid-gap', label: 'Grid gap', min: 8, max: 48, default: 16,
    effect: { scope: 'grid', variable: '--fd-grid-gap' } }]
})
---
<FoundationDevtools config={config} />
```

`FoundationDevtools.astro` prüft selbst `import.meta.env.PROD` und rendert im Produktions-Build nichts.

Website-Markup deklariert Scopes mit `data-fd-scope`. Effects setzen ausschließlich CSS Custom Properties oder Datenattribute:

```html
<section data-fd-scope="grid"><article data-fd-scope="card"></article></section>
```

Ohne eigenen Effect werden Familien als `data-fd-variant-card="default"` auf dem gleichnamigen Scope markiert.

### Targets und Changes

Optional ordnet `targets` Controls und Families einer Seite bzw. einem Bereich zu. Sections werden im Markup mit `data-fd-target` registriert; ungültige Zuordnungen werden verworfen. `kind: 'global'` bleibt seitenweit, `kind: 'section'` scoped auf das registrierte Element:

```ts
const config = defineDevtoolsConfig({ project: 'site', targets: [
  { key: 'hero', label: 'Hero', kind: 'section' },
], families: [{ key: 'card', label: 'Card', target: 'hero', variants: [{ name: 'default' }] }], controls: [{
  type: 'select', key: 'density', label: 'Density', classification: 'token',
  options: [{ value: 'comfortable', label: 'Comfortable' }, 'compact'], default: 'comfortable',
  target: 'hero', effect: { scope: 'card', attribute: 'density' },
}] });
```

`changes(config, state)` und `changesJson` liefern ausschließlich geänderte Werte gegenüber `initialState`; `agentBrief` erzeugt eine knappe Markdown-Zusammenfassung. Panel-Auswahl und Vergleichsmodus sind UI-State und werden nicht exportiert. Ein Family-Effect kann stattdessen ein vorhandenes Website-Attribut wie `data-card-variant` setzen. Ein Control-Effect mit `attribute: 'card-density'` setzt entsprechend `data-card-density`.

Website-CSS kann Tailwind über semantische Layer verwenden. Dynamische Reglerwerte bleiben CSS Custom Properties:

```css
@import 'tailwindcss';

@layer components {
  .project-grid {
    @apply grid;
    grid-template-columns: repeat(var(--project-grid-columns), minmax(0, 1fr));
    gap: var(--project-grid-gap);
  }

  .project-card[data-card-layout='split'] {
    @apply grid border-t;
    grid-template-columns: minmax(0, 1.2fr) minmax(12rem, 0.8fr);
  }
}
```

## Öffentliche Schnittstelle

`DevtoolsConfig`, `Metadata`, `Family`, `Variant`, `Range`, `Select`, `Toggle`, `DevtoolsState` sowie `defineDevtoolsConfig`, `validateConfig`, `initialState`, `validateState`, `encodeState`, `decodeState`, `stateUrl`, `applyEffects`, `recipe` und `typescriptRecipe` sind serialisierbar bzw. strict typisiert. Ungültige URL-Werte werden verworfen (fail-closed).

Das Panel startet platzsparend eingeklappt. Es bietet Reset, Permalink-, JSON- und TypeScript-Copy sowie JSON-Download. Es ist vollständig ausblendbar und per Cmd/Ctrl+Shift+D wiederherstellbar beziehungsweise umschaltbar. Tastaturfokus und Reduced Motion werden berücksichtigt. URL-State verwendet nur den Parameter `fd` und erhält vorhandene Parameter.

## Entwicklung

```bash
npm install
npm run check
npm test
npm run build
```
