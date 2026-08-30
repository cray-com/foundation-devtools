# Foundation Devtools

`@cray-com/foundation-devtools` ist ein frameworkfreies, neutrales Entwicklungswerkzeug zum Vergleichen und Abstimmen von Website-Varianten auf der echten Seite. Es enthält weder Renderer noch Design-Tokens.

## Installation

```bash
npm install github:cray-com/foundation-devtools
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
  families: [{ key: 'card', label: 'Card', variants: [{ name: 'default' }, { name: 'compact' }] }],
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

Familien werden konsistent als `data-fd-variant-card="default"` auf ihren Scopes markiert. Ein Attribute-Effect mit `attribute: 'card-density'` setzt entsprechend `data-card-density`.

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
