# Foundation Devtools

`@cray-com/foundation-devtools` ist ein frameworkfreies, neutrales Entwicklungswerkzeug zum Vergleichen und Abstimmen von Website-Varianten auf der echten Seite. Es enthält weder Renderer noch Design-Tokens.

## Installation

```bash
npm install --save-dev https://github.com/cray-com/foundation-devtools/releases/download/v1.0.0/cray-com-foundation-devtools-1.0.0.tgz
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
  targets: [{ key: 'project-list', label: 'Project list', kind: 'section' }],
  registrations: [
    { key: 'project-grid', label: 'Project grid', scope: 'grid', target: 'project-list' },
    { key: 'project-card', label: 'Project card', scope: 'card', target: 'project-list' },
  ],
  families: [{
    key: 'card-layout', label: 'Card layout', target: 'project-list',
    effect: { scope: 'card', attribute: 'card-variant' },
    variants: [{ name: 'default' }, { name: 'compact' }],
  }],
  controls: [{ type: 'range', key: 'grid-gap', label: 'Grid gap', min: 8, max: 48, default: 16,
    target: 'project-list', effect: { scope: 'grid', variable: '--fd-grid-gap' } }],
  compose: { families: ['card-layout'], controls: ['grid-gap'] }
})
---
<FoundationDevtools config={config} />
```

`FoundationDevtools.astro` prüft selbst `import.meta.env.PROD` und rendert im Produktions-Build nichts.

Website-Markup deklariert Scopes mit `data-fd-scope`. Effects setzen ausschließlich CSS Custom Properties oder Datenattribute:

```html
<section data-fd-target="project-list" data-fd-scope="grid">
  <article data-fd-scope="card"></article>
</section>
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

`registrations` geben ausgewählten DOM-Elementen einen expliziten Component-/Scope-Kontext. Die Registrierung leitet nichts aus CSS-Klassen ab. `compose` ist eine Allowlist: Nur dort aufgeführte vorhandene Families, Controls und Recipes erscheinen in Compose. Ungültige oder unbekannte Keys lassen die Konfiguration fehlschlagen.

`changes(config, state)` und `changesJson` liefern ausschließlich geänderte Werte gegenüber `initialState`; `agentBrief` erzeugt eine knappe Markdown-Zusammenfassung. `handoff` ergänzt begrenzte Auswahl-, Annotation- und Intent-Daten. Panel, Picker, Auswahl, Annotationen und Vergleichsmodus bleiben UI-State und werden nicht als Designänderungen exportiert. Ein Family-Effect kann stattdessen ein vorhandenes Website-Attribut wie `data-card-variant` setzen. Ein Control-Effect mit `attribute: 'card-density'` setzt entsprechend `data-card-density`.

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

Die Konfigurationstypen `DevtoolsConfig`, `Metadata`, `Target`, `DomRegistration`, `ComposeRegistration`, `Recipe`, `Family`, `Variant`, `Range`, `Select`, `SelectOption`, `Toggle` und `DevtoolsState` sind serialisierbar und strict typisiert.

Der Design-State verwendet `defineDevtoolsConfig`, `validateConfig`, `initialState`, `validateState`, `encodeState`, `decodeState`, `stateUrl`, `applyEffects`, `changes`, `changesJson`, `agentBrief`, `resetBaseline`, `recipe`, `recipeRegistry` und `typescriptRecipe`. Der Inspector stellt `LayoutFacts`, `Annotation`, `domPath`, `resolvePath`, `layoutFacts`, `annotationFor`, `safeRoute` und `handoff` bereit. Nicht-kanonische Alias-Exporte werden nicht angeboten. Ungültige Config-, URL- und Handoff-Werte werden fail-closed verworfen oder begrenzt.

Das Panel startet beim ersten Aufruf geöffnet und merkt sich danach Position, aktive Ansicht und den eingeklappten Zustand. Es bietet Reset, Permalink-, JSON- und TypeScript-Copy sowie JSON-Download. Es ist vollständig ausblendbar und per Cmd/Ctrl+Shift+D wiederherstellbar beziehungsweise umschaltbar. Tastaturfokus und Reduced Motion werden berücksichtigt. URL-State verwendet nur den Parameter `fd` und erhält vorhandene Parameter.

## DOM-Inspector (V1)

Im Development-Modus stehen `Inspect`, `Compose` und `Changes` zur Verfügung. `Pick DOM` wählt beliebige Elemente einschließlich offener Shadow Roots. Breadcrumb, Parent-/Child-Navigation, Page Map und registrierte Scopes/Targets liefern Kontext. Bounding Box, Display, Grid, Gap, Position und Overflow bleiben read-only. Selector, DOM-Pfad und begrenzter Kontext lassen sich separat kopieren.

Bis zu acht begrenzte Annotationen und ein optionaler Intent werden zusammen mit dem changes-only Diff als `Copy agent brief` exportiert. Routen verlieren Credentials, Query und Fragment; Formwerte und vollständiges HTML werden nicht exportiert. `Freeze motion`, gruppiertes Undo/Redo sowie Edge-/Corner-Snap unterstützen die Arbeit auf der echten Seite. Beim Auftauen kann eine laufende CSS-Transition browserbedingt nicht an ihrer exakten Zwischenposition fortgesetzt werden; das Tool entfernt aber ausschließlich eigene Freeze-Styles und verändert keine fremden Inline-Styles. Es gibt keine Source-Writes, keine Agent-Bridge und keinen visuellen Recipe-Generator.

### Zustand und Tastatur

- URL: ausschließlich validierter Design-Preview-State im Parameter `fd`; fremde Query-Parameter bleiben erhalten.
- `localStorage`: Panelposition, aktive Ansicht und Open-/Collapsed-Zustand.
- `sessionStorage`: Auswahl, Annotationen und Intent. Hide überlebt keinen Reload.
- Global: `Cmd/Ctrl + Shift + D` zeigt, versteckt oder stellt das Panel wieder her.
- Bei Tool-Fokus oder aktivem Picker: `I` Picker, `V` Website-Modus, `1`/`2`/`3` Ansichten, `[`/`]` Parent/Child, `A` Annotation, `Shift + 2` Auswahl fokussieren, gehaltenes `Space` Picker aussetzen, `Cmd/Ctrl + Z` Undo, `Cmd/Ctrl + Shift + Z` Redo, `Cmd/Ctrl + Enter` Agent Brief und `Escape` zurück.

## Entwicklung

```bash
npm install
npm run check
npm test
npm run build
```
