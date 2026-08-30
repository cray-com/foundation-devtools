# Foundation Devtools Arbeitsregeln

## Einstieg

Vor Architektur- oder Planungsarbeit `PROJECT.md` lesen. `README.md` beschreibt die öffentliche Nutzung.

## Produktgrenzen

- Das Paket besitzt nur neutrales Entwicklungswerkzeug. Website-Renderer, Tokens, Inhalte und konkrete Varianten bleiben im jeweiligen Website-Repository.
- Die normale Website bleibt direkt sichtbar. Das Tool rendert eine kompakte, schwebende und vollständig ausblendbare Oberfläche.
- Devtools-State verändert ausschließlich deklarierte CSS-Variablen oder Datenattribute. Er wird nicht zu CMS-Inhalt oder Produktionskonfiguration.
- Browsercode schreibt in v1 keine Quelldateien. Er exportiert reproduzierbare Rezepte.
- Der Astro-Adapter wird nur im Development-Modus eingebunden. Produktionsartefakte müssen frei von Devtools-Markern bleiben.

## Implementierung

- Frameworkfreier TypeScript-Kern, browserseitiges Custom Element mit Shadow DOM und kleiner Astro-Adapter.
- Öffentliche Interfaces bleiben klein, serialisierbar und strict typisiert.
- Keine dynamisch erzeugten Tailwind-Klassennamen und keine Abhängigkeit von Website-CSS.
- Panel-Styling ist neutral, dicht, tastaturbedienbar und respektiert Reduced Motion.
- Neue Abhängigkeiten nur bei klarem Nutzen; keine UI-Frameworks für v1.

## Checks

Nach Änderungen mindestens ausführen:

```bash
npm run check
npm test
npm run build
```

Für UI-Änderungen zusätzlich den Browser-Smoke-Test ausführen. `git diff --check` muss sauber bleiben.
