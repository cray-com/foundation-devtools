# Foundation Devtools

## Ziel

Foundation Devtools verkürzt visuelle Iteration in Foundation-Websites. Entwickler wählen benannte Varianten, verändern begrenzte Darstellungsparameter live und exportieren den gefundenen Stand als reproduzierbares Rezept, ohne Payload, Staging oder eine zusätzliche Workshop-Oberfläche zu benötigen.

## Eigentum

Das Repository besitzt:

- Definition und Validierung der Devtools-Konfiguration;
- URL- und Session-State;
- Anwendung deklarierter CSS-Variablen und Datenattribute;
- das dichte neutrale Floating-Panel;
- Rezept-, Permalink- und JSON-Export;
- den Astro-Adapter.

Website-Repositories besitzen:

- Renderer, Markup und Website-Styling;
- Design Tokens und semantische Tailwind-`@layer`-Regeln;
- Variantennamen, Defaults und Parametergrenzen;
- die Zuordnung von Devtools-Scopes zu sichtbaren Bereichen.

## Architektur

Ein einzelnes npm-Paket `@cray-com/foundation-devtools` exportiert einen frameworkfreien Kern und `@cray-com/foundation-devtools/astro`.

```text
serialisierbare Website-Konfiguration
  → State und URL-Codec
  → deklarative Effects
  → CSS-Variablen oder Datenattribute auf data-fd-scope
  → bestehende Website-Renderer
```

Der Astro-Adapter montiert ein browserseitiges Custom Element. Das Panel verwendet Shadow DOM, damit Website-CSS und Tool-CSS einander nicht beeinflussen.

## V1.1

V1.1 liefert:

- Range-, Select- und Toggle-Controls; optionale Target/Page-Map-Zuordnung (`global`/`section`) und Token-/Local-Klassifikation; labeled Select-Optionen;
- stabile Changes-/JSON-/Agent-Brief-Exporte gegenüber `initialState` (reiner Design-State, ohne Panel-UI-State);
- benannte Variant Families mit Defaults;
- URL-persistierten State und kopierbare Permalinks;
- Reset, JSON-/TypeScript-Rezept, Copy und Download;
- Fixture-, Tenant-, Locale-, Route- und Revisionsmetadaten;
- eingeklappten, geöffneten und vollständig versteckten Zustand;
- Wiederherstellung über `Cmd/Ctrl + Shift + D`;
- Reduced Motion, Tastaturbedienung und dichte responsive Darstellung;
- Unit-Tests und einen Astro-Browser-Smoke-Test;
- Nachweis, dass ein Produktions-Build keine Devtools-Oberfläche enthält.

Erster realer Adapter ist das Project-Listing in `astro-foundation` mit Controls für Layoutgrid und Project Card. Clifford Ray folgt als zweiter Adapter, ohne dessen visuelle Implementierung zu teilen.

## Nicht in V1

- CMS- oder Produktionsmutationen;
- direktes Schreiben in Quelldateien;
- Drag-and-drop-Komposition;
- Canvas-, Review- oder Inspect-Shells;
- visuelle Website-Komponenten oder Design Tokens;
- ein eigenes UI-Framework.

## V1 DOM-Inspector und Layouting

Das Tool bietet drei getrennte Ansichten (`Inspect`, `Compose`, `Changes`). Inspect erlaubt einen freien, sicheren DOM-Picker mit Breadcrumb-/Parent-/Child-Navigation, registriertem Component-/Scope-Kontext und read-only Layout-Fakten. Compose verwendet ausschließlich explizit registrierte Website-Recipes. Changes exportiert nur Design-Diffs und begrenzte Annotationen/Intent als Agent-Brief. Auswahl- und Panel-Zustand bleiben aus Design-State und Recipes ausgeschlossen. Picker, Annotationen, Freeze Motion, Undo/Redo und Handoff schreiben keine Quelldateien.

## Aktueller Fokus

1. Das öffentliche Paket und seine kleine Konfigurationsschnittstelle liefern.
2. Das Bento-Experiment aus Astro #40 als ersten echten Adapter integrieren.
3. Die Tailwind-`@layer`-basierte Foundation-Base-Arbeitsweise dokumentieren.
4. Danach die zweite Adapterintegration im Portfolio nachweisen.
