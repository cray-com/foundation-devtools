# Foundation Devtools

Dense, design-neutral development tooling for comparing and tuning website variants directly on the real page.

Foundation Devtools provides a small Astro mount, a browser-side control panel, URL-persisted variant state and recipe export. Website repositories keep ownership of their renderers, styles and variant recipes.

## Status

Foundation Devtools v1 is under active development. The first integration target is `cray-com/astro-foundation`.

## Principles

- The normal website remains the development canvas.
- The panel is compact, neutral, floating and completely hideable.
- Named variants and temporary tuning parameters remain separate.
- Parameter changes target declared CSS variables or data attributes.
- Website content models and Payload stay unchanged.
- Production builds contain no Devtools UI or state.

## Planned usage

```astro
---
import FoundationDevtools from '@cray-com/foundation-devtools/astro'
import { devtoolsConfig } from '../devtools/config'
---

{import.meta.env.DEV && <FoundationDevtools config={devtoolsConfig} />}
```

```ts
import { defineDevtoolsConfig } from '@cray-com/foundation-devtools'

export const devtoolsConfig = defineDevtoolsConfig({
  project: 'astro-foundation',
  families: [],
})
```

## Development

Commands are documented by `npm run` and in [`AGENTS.md`](AGENTS.md).

## License

MIT
