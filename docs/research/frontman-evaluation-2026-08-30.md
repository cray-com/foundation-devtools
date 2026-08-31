# Frontman-Evaluation für Foundation Devtools

- Datum: 2026-08-30
- Referenz: [`frontman-ai/frontman` bei `7a2776a`](https://github.com/frontman-ai/frontman/tree/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6)
- Untersuchte Versionen: Repository-Release `v4.0.0`, `@frontman-ai/astro@2.0.3`
- Ziel: Verwertbare Konzepte für Foundation Devtools identifizieren, ohne dessen kleinen, deterministischen und schreibgeschützten Auftrag aufzugeben.

## Kurzurteil

Frontman ist kein besser ausgestattetes Token-Panel, sondern ein verteilter browserbasierter Coding Agent. Er verbindet eine Preview-Oberfläche, DOM- und Screenshot-Werkzeuge, Astro-/Vite-/Next-Middleware, lokale Dateizugriffe, einen externen oder selbst gehosteten Phoenix-Server, PostgreSQL und einen LLM-Provider.

Für Foundation gilt daher:

1. **Frontman nicht integrieren und nicht forken.** Produktgrenze, Runtime-Gewicht, Datenfluss und Schreibberechtigungen passen nicht zum aktuellen Devtools-Auftrag.
2. **Keinen Frontman-Code übernehmen.** Die Lizenzen sind geteilt; insbesondere der Server ist AGPL-3.0-only plus AI Supplementary Terms. Foundation braucht die Implementierung nicht und sollte rechtliche Ableitungsfragen vermeiden.
3. **Einige Interaktionskonzepte unabhängig übernehmen:** präzise Annotationen, Parent-/Child-Navigation, Animation Freeze, kleine serialisierbare Auswahlkontexte, strikte Output-Limits und Read-before-write/Stale-Checks für eine mögliche spätere Agent-Seam.
4. **Foundation Devtools bleibt vorerst der bessere Kern für Foundation:** registrierte Targets, explizite Token-Allowlist, benannte Recipes, Changes-only Export, kein Server, keine Accounts und keine Source-Writes.

## Was Frontman nachweislich ist

Die offizielle Architektur beschreibt vier Laufzeitorte:

- Browser-Client für Chat, Preview und Browser-Werkzeuge;
- lokaler Framework-Adapter für Datei-, Routing- und Build-Kontext;
- Frontman-Server für Agent-Loop, Sessions und persistierte Task-Historie;
- externer LLM-Provider.

Browser- und Dateitools werden über ACP/MCP und JSON-RPC geroutet. Dateizugriffe laufen lokal durch den Framework-Adapter, aber Prompts, Screenshots, Dateiinhalte, Logs, Tool-Ergebnisse und generierter Output können über Frontman Server zum gewählten LLM-Provider fließen.

Primärquellen:

- [Architecture Overview](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/apps/marketing/src/content/docs/docs/reference/architecture.md)
- [Astro Integration](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/apps/marketing/src/content/docs/docs/integrations/astro.mdx)
- [Tool Capabilities](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/apps/marketing/src/content/docs/docs/using/tool-capabilities.md)

## Interessante, verifizierte Fähigkeiten

### 1. Element-Annotationen statt bloßer Section-Auswahl

Frontman kann mehrere Elemente markieren. Eine Annotation enthält unter anderem:

- CSS-Selektor;
- Screenshot des Elements;
- Source-Datei und Position, soweit auflösbar;
- Tag, Klassen, Component-Name und begrenzte Props;
- nahen Text und Bounding Box;
- optionalen Kommentar des Nutzers.

Annotationen haben nummerierte Marker, lassen sich entfernen und können per Parent-/Child-Navigation korrigiert werden. Animationen können während der Auswahl eingefroren werden.

Quelle: [Annotations](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/apps/marketing/src/content/docs/docs/using/annotations.md)

### 2. Astro-7-Source-Mapping

`@frontman-ai/astro` verwendet einen dev-only Vite-Transform. Er parst `.astro`-Dateien vor dem Compiler und ergänzt `data-frontman-source-file` sowie `data-frontman-source-loc`. Der Plugin-Hook ist mit `apply: "serve"` begrenzt. Die Integration selbst registriert Middleware, Toolbar und Injects nur, wenn Astros Command `dev` ist.

Quellen:

- [`vite-plugin-source-annotations.mjs`](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/libs/frontman-astro/src/vite-plugin-source-annotations.mjs)
- [`FrontmanAstro__Integration.res`](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/libs/frontman-astro/src/FrontmanAstro__Integration.res)

### 3. Begrenzte DOM-Inspektion

Der vereinfachte DOM-Export enthält Selektoren, wichtige Attribute, Accessibility-Rolle/-Name, Component-Namen, direkten Text und Child-Counts. Er ist auf 200 Nodes und 30 KB begrenzt; vollständiges `outerHTML` ist auf 15 KB begrenzt. Formwerte sowie Script-/Style-/SVG-Inhalte werden im vereinfachten Modus nicht ausgegeben. Open Shadow DOM kann optional traversiert werden. URLs werden von Credentials, Query und Fragment bereinigt; `blob:` und `data:` werden redigiert.

Quellen:

- [`Client__ElementInspector.res`](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/libs/client/src/Client__ElementInspector.res)
- [`Client__Tool__GetDom.res`](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/libs/client/src/tools/Client__Tool__GetDom.res)

### 4. Screenshot- und Browser-Kontext

Frontman unterstützt Element-, Viewport- und Full-Page-Screenshots sowie DOM-, Accessibility-, Interaktions- und Device-Werkzeuge. Zusätzlich kann der Agent beliebiges JavaScript mit `new Function` im Preview-Iframe ausführen, etwa zum Lesen berechneter Styles. Das ist leistungsfähig, aber wesentlich breiter als Foundations deklarierte Effect-Seam.

Quellen:

- [`Client__Tool__TakeScreenshot.res`](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/libs/client/src/tools/Client__Tool__TakeScreenshot.res)
- [Tool Capabilities](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/apps/marketing/src/content/docs/docs/using/tool-capabilities.md)

### 5. Sicherheitsgeländer für spätere Source-Writes

Die lokalen Dateiwerkzeuge verlangen bei bestehenden Dateien einen vorherigen Read. Sie speichern Mtime und Dateigröße und verweigern einen Edit, wenn die Datei seit dem Read verändert wurde. Teilreads werden als Line-Ranges erfasst; ein Edit außerhalb gelesener Ranges erzeugt eine Warnung. Framework-Adapter warten nach einem Edit kurz auf HMR und hängen neue Dev-Server-Fehler an das Tool-Ergebnis.

Das ist ein nützliches Referenzprinzip für eine mögliche spätere Agent-Seam, aber kein Grund, Source-Writes jetzt in Foundation Devtools einzubauen.

Quellen:

- [`FrontmanCore__FileTracker.res`](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/libs/frontman-core/src/FrontmanCore__FileTracker.res)
- [`FrontmanCore__Tool__EditFile.res`](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/libs/frontman-core/src/tools/FrontmanCore__Tool__EditFile.res)
- [`FrontmanCore__Tool__EditFileWithLogCheck.res`](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/libs/frontman-core/src/tools/FrontmanCore__Tool__EditFileWithLogCheck.res)

## Design Tokens: Marketing stärker als das typisierte Modell

Frontman wirbt damit, vorhandene Spacing Scales, Farb-Tokens und Component Patterns automatisch zu lesen. Im untersuchten öffentlichen Interface ist jedoch kein mit Foundation vergleichbares, deklaratives Token Registry-Modell erkennbar. Der Agent erhält DOM, berechnete Styles, Projektdateien und Anweisungen und leitet daraus Konventionen ab.

Foundation Devtools ist hier enger und berechenbarer:

- nur freigegebene Tokens sind editierbar;
- Defaults, Wertebereiche, Einheiten und Effects sind typisiert;
- globale und lokale Werte sind explizit klassifiziert;
- der Changes-Diff ist deterministisch;
- Variant Recipes bleiben website-owned.

Frontmans Kontext kann später helfen, **welches Element** gemeint ist. Foundation sollte weiterhin bestimmen, **welche Tokens und Recipes** verändert werden dürfen.

## Produktionsausschluss

Für Astro ist der Ausschluss gut nachvollziehbar:

- Integration arbeitet nur bei `ctx.command == dev`;
- Source-Annotationen und Props-Injection verwenden Vites `apply: "serve"`;
- offizielle Dokumentation bezeichnet den Build-Pfad als No-op.

Das ist konzeptionell deckungsgleich mit Foundation, ersetzt aber keinen Artefakttest. Foundations rekursiver Production-Scan bleibt die stärkere projektspezifische Garantie.

## Gewicht und Kopplung

Das veröffentlichte `@frontman-ai/astro@2.0.3` ist laut npm entpackt etwa 657 KB groß und hängt direkt unter anderem von Astro Compiler, Chrome Launcher, Lighthouse, Magic String und Source Map ab. Der private Browser-Client ist an React 19 gebunden und verwendet unter anderem Tiptap, SnapDOM und Diff-Bibliotheken. Der selbst gehostete Server benötigt Phoenix/Elixir, PostgreSQL, OAuth/WorkOS und einen LLM-Provider.

Frontman ist damit plausibel für sein Produkt, aber kein kleiner Adapter für ein neutrales Token-Panel.

Quellen:

- [`libs/frontman-astro/package.json`](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/libs/frontman-astro/package.json)
- [`libs/client/package.json`](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/libs/client/package.json)
- [npm `@frontman-ai/astro@2.0.3`](https://www.npmjs.com/package/@frontman-ai/astro/v/2.0.3)

## Datenschutz, Betrieb und Berechtigungen

Der Standard-Astro-Setup verbindet sich mit `api.frontman.sh` und verlangt Anmeldung sowie einen verbundenen Modellprovider. Selbsthosting verschiebt Orchestrierung und Task-Historie auf den eigenen Server, macht den Datenfluss aber nicht lokal-only: relevante Inhalte können weiterhin zum gewählten LLM-Provider gelangen.

Die offizielle Self-Hosting-Dokumentation nennt zusätzliche Punkte:

- PostgreSQL speichert Tasks, Interactions, Accounts und verschlüsselte Provider-Credentials;
- Produktionsauthentifizierung verwendet WorkOS;
- Sentry- und Heap-Egress sind im untersuchten Stand nicht über dokumentierte Runtime-Optionen deaktivierbar;
- Phoenix Socket Origin Checking steht auf `false` und muss bei strengerem Threat Model angepasst werden;
- Browser-Werkzeuge und lokale File-Tools bleiben trotz Selfhosting verteilte Bestandteile.

Quelle: [Self-Hosting](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/apps/marketing/src/content/docs/docs/reference/self-hosting.md)

## Lizenzbewertung

Das Repository verwendet ein Split-Modell:

- Client- und JavaScript-Framework-Libraries: Apache-2.0;
- Frontman Server: AGPL-3.0-only;
- Server zusätzlich: AI Supplementary Terms;
- WordPress-Plugin: GPL-2.0-or-later.

Die Supplementary Terms beziehen sich ausdrücklich auf `apps/frontman_server/` und untersagen unter anderem AI-vermittelte Reproduktion einer wesentlich ähnlichen oder konkurrierenden Agent-Orchestrierung. Diese Auswertung ist keine Rechtsberatung. Weil Foundation Devtools selbst Development-Tooling ist und eine Wiederverwendung nicht nötig ist, ist die sichere Produktentscheidung: **keinen Frontman-Servercode und keine davon abgeleitete Agent-Architektur übernehmen**. Auch Apache-Code sollte nur nach separater Lizenzprüfung und ohne AI-vermittelte Ableitung übernommen werden; aktuell gibt es dafür keinen technischen Bedarf.

Quellen:

- [Repository-Lizenz](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/LICENSE)
- [Server-Lizenz](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/apps/frontman_server/LICENSE)
- [AI Supplementary Terms](https://github.com/frontman-ai/frontman/blob/7a2776ab9d556a7cccf37ad7c30ccd59112f86b6/AI-SUPPLEMENTARY-TERMS.md)

## Vergleich mit Foundation Devtools

| Thema | Frontman | Foundation Devtools |
| --- | --- | --- |
| Primärziel | Browserbasierter Coding Agent | Deterministisches Varianten-/Token-Tuning |
| Auswahl | Beliebige DOM-Elemente, mehrere Annotationen | Registrierte Page Targets und Effects |
| Source Mapping | Framework-/Compiler-gestützt | Derzeit nicht nötig bzw. nicht vorhanden |
| Änderungen | Direkte lokale Dateischreibwerkzeuge | Nur Live-Preview und Copy/Paste-Diff |
| Token-Modell | Aus Projektkontext abgeleitet | Deklarative Allowlist mit Typen/Defaults |
| Infrastruktur | Browser + Dev Server + Server + DB + LLM | Browser-Custom-Element + kleiner Astro-Adapter |
| Accounts/Secrets | Login und Modellprovider nötig | Keine Accounts oder Provider |
| Produktion | Dev-only Integration | Dev-only Adapter plus rekursiver Artefakttest |
| Designsystem-Grenze | Agent soll Konventionen erkennen | Website besitzt Tokens, Recipes und Renderer |

## Was Foundation konkret übernehmen sollte

### Nächster kleiner Slice

1. **Annotation Context neben Page Map**  
   Registrierte Targets oder Scopes können optional mit einem kurzen Kommentar markiert werden. Der Export enthält Target-Key, Label, Route, Locale, Bounding Box und Kommentar. Keine Source-Datei und kein Agent nötig.

2. **Parent-/Child-Navigation innerhalb registrierter Targets**  
   Nicht beliebiges DOM öffnen, sondern zwischen Section Target und seinen registrierten Effect-Scopes wechseln, beispielsweise `Project List → Grid → Cards`.

3. **Freeze Motion**  
   Ein kleiner temporärer Toggle pausiert CSS-Animationen, Transitions und Videos während Auswahl und Screenshot. Er gehört ausschließlich zum Panel-UI-State.

4. **Bounded Handoff**  
   Agent Brief und optionale Annotationen erhalten harte Limits, redigieren URLs und enthalten keine Formwerte, Secrets oder vollständiges HTML.

### Später, nur wenn Agent-Integration priorisiert wird

5. **Manuell deklarierte Source References**  
   Targets können website-owned Metadaten wie `sourceFile` oder `owner` erhalten. Das ist kleiner und berechenbarer als sofort einen Astro-Compiler-Transform einzuführen.

6. **Read-only MCP-Seam**  
   Ein lokaler Adapter könnte registrierte Targets, effektive Tokenwerte und Changes-Diffs für einen externen Coding Agent lesbar machen. Source-Writes bleiben zunächst beim bestehenden Pi-/Git-Workflow.

7. **Bei späteren Writes dieselben Invarianten erzwingen**  
   Read-before-write, Stale-Check, enge Source Root, exakter Diff, Syntax-/Build-Check und menschliches Merge-Gate müssen dann Tool-Invarianten sein, nicht nur Prompttext.

## Was Foundation nicht übernehmen sollte

- eingebauten Chat oder vollständigen Agent-Loop;
- automatische Source-Writes aus dem Browser;
- beliebiges `execute_js` als öffentliches Tool;
- generischen DOM-Inspector als Ersatz für registrierte Targets;
- eigene Task-Datenbank, Accounts oder Provider-Credentials;
- Preview-Iframe und Device-Shell, solange die normale Website direkt funktioniert;
- Frontman-Server oder dessen Orchestrierung;
- Figma-Sync.

## Empfehlung

Foundation Devtools sollte **Frontmans Auswahlpräzision, nicht Frontmans Produktform** übernehmen. Der wertvollste nächste Schritt ist eine kleine, serialisierbare Annotation auf registrierten Targets/Scopes, die zusammen mit dem bereits vorhandenen Changes-Diff kopiert werden kann. Das verbessert den Agent-Handoff deutlich, ohne Source-Writes, externe Server, Accounts oder einen Agent-Loop einzuführen.

Eine echte Frontman-Installation sollte – falls später gewünscht – nur als getrenntes Throwaway-Experiment erfolgen. Dafür wären vorab ausdrückliche Zustimmung zu externem Datenfluss und Lizenzbedingungen sowie klare Tests für Netzwerk-Egress, Astro-7-Source-Mapping, Produktionsausschluss und Konflikte mit Foundation Devtools nötig.
