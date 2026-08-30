import {
  applyEffects,
  decodeState,
  recipe,
  stateUrl,
  typescriptRecipe,
  validateConfig,
  type Control,
  type DevtoolsConfig,
  type DevtoolsState,
  type Range,
} from './core.js';

const styles = `
:host { all: initial; position: fixed; inset: auto 12px 12px auto; z-index: 2147483647; color: #e9edf2; font: 12px/1.3 ui-monospace, SFMono-Regular, monospace; }
* { box-sizing: border-box; }
.panel { width: min(360px, calc(100vw - 24px)); max-height: min(760px, calc(100vh - 24px)); overflow: auto; background: #17191c; border: 1px solid #454a51; border-radius: 6px; box-shadow: 0 5px 24px #0008; }
.bar { display: flex; align-items: center; gap: 6px; padding: 5px 7px; background: #22262a; position: sticky; top: 0; }
.title { flex: 1; font-weight: 700; } button { border: 0; border-radius: 3px; padding: 4px 6px; color: inherit; background: #292e34; cursor: pointer; } .icon { background: transparent; font-size: 15px; }
button:focus, select:focus, input:focus { outline: 2px solid #74b9ff; outline-offset: 1px; }
.body { display: grid; gap: 8px; padding: 9px; } .control { display: grid; gap: 3px; } label { display: flex; justify-content: space-between; gap: 8px; color: #c8cdd3; } output { color: #fff; }
input, select { width: 100%; min-width: 0; color: #fff; background: #292e34; border: 1px solid #555b64; border-radius: 3px; padding: 3px; } input[type=checkbox] { width: auto; justify-self: start; }
.meta, .status { padding: 7px 9px; color: #9ba3ad; border-top: 1px solid #353a40; } .status:empty { display: none; } footer { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 8px; border-top: 1px solid #353a40; } .collapsed .body, .collapsed footer, .collapsed .meta, .collapsed .status { display: none; } .hidden { display: none; }
@media (max-width: 420px) { :host { inset: auto 6px 6px auto; } .panel { width: min(320px, calc(100vw - 12px)); max-height: calc(100vh - 12px); } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
`;

export class FoundationDevtoolsElement extends HTMLElement {
  private config?: DevtoolsConfig;
  private state?: DevtoolsState;
  private panel?: HTMLElement;
  private status?: HTMLElement;
  private storageKey = 'foundation-devtools:panel';
  private ready = false;

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    if (!this.ready) this.build();
    document.addEventListener('keydown', this.recover);
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this.recover);
  }

  configure(config: DevtoolsConfig): void {
    this.config = validateConfig(config);
    this.storageKey = `foundation-devtools:${this.config.project}:panel`;
    const encoded = new URL(location.href).searchParams.get(this.config.queryKey ?? 'fd');
    this.state = decodeState(this.config, encoded);
    this.restorePanelMode();
    this.render();
    this.apply();
  }

  private build(): void {
    const root = this.shadowRoot!;
    root.innerHTML = `<style>${styles}</style>
      <section class="panel collapsed" aria-label="Foundation Devtools">
        <header class="bar"><strong class="title">FD · devtools</strong>
          <button class="icon" data-action="collapse" aria-label="Panel öffnen" aria-expanded="false">+</button>
          <button class="icon" data-action="hide" aria-label="Ausblenden">×</button>
        </header><div class="body"></div><div class="meta"></div><div class="status" role="status" aria-live="polite"></div>
        <footer><button data-action="reset">Reset</button><button data-action="permalink">Permalink</button>
          <button data-action="json">JSON</button><button data-action="ts">TypeScript</button><button data-action="download">Download</button></footer>
      </section>`;
    this.panel = root.querySelector('.panel')!;
    this.status = root.querySelector('.status')!;
    root.addEventListener('click', (event) => this.action((event.target as HTMLElement).dataset.action));
    this.ready = true;
  }

  private recover = (event: KeyboardEvent): void => {
    if (event.shiftKey && event.key.toLowerCase() === 'd' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (this.panel?.classList.contains('hidden')) this.setPanelMode('collapsed');
      else this.setPanelMode(this.panel?.classList.contains('collapsed') ? 'open' : 'collapsed');
    }
  };

  private render(): void {
    if (!this.config || !this.state) return;
    const body = this.shadowRoot!.querySelector('.body')!;
    body.replaceChildren();
    for (const family of this.config.families) {
      const select = document.createElement('select');
      select.id = `fd-family-${family.key}`;
      for (const variant of family.variants) select.add(new Option(variant.label ?? variant.name, variant.name));
      select.value = this.state.families[family.key];
      select.addEventListener('change', () => {
        this.state!.families[family.key] = select.value;
        const chosen = family.variants.find((variant) => variant.name === select.value);
        Object.assign(this.state!.values, chosen?.defaults ?? {});
        this.render();
        this.update();
      });
      body.append(this.row(family.label, select, `fd-family-label-${family.key}`));
    }
    for (const control of this.config.controls ?? []) body.append(this.control(control));
    const metadata = Object.entries(this.config.metadata ?? {}).map(([key, value]) => `${key}: ${value}`).join(' · ');
    this.shadowRoot!.querySelector('.meta')!.textContent = `${this.config.project}${metadata ? ` · ${metadata}` : ''}`;
  }

  private row(labelText: string, input: HTMLElement, labelId: string, output?: HTMLOutputElement): HTMLElement {
    const row = document.createElement('div');
    row.className = 'control';
    const label = document.createElement('label');
    label.id = labelId;
    label.htmlFor = input.id;
    label.append(document.createTextNode(labelText));
    if (output) label.append(output);
    row.append(label, input);
    return row;
  }

  private control(control: Control): HTMLElement {
    const input = document.createElement(control.type === 'select' ? 'select' : 'input') as HTMLInputElement | HTMLSelectElement;
    input.id = `fd-control-${control.key}`;
    const output = document.createElement('output');
    output.htmlFor = input.id;
    if (control.type === 'range') {
      const range = input as HTMLInputElement;
      range.type = 'range';
      range.min = String(control.min);
      range.max = String(control.max);
      range.step = String(control.step ?? 1);
      range.value = String(this.state!.values[control.key]);
      output.textContent = this.rangeText(control, range.value);
      range.addEventListener('input', () => {
        this.state!.values[control.key] = Number(range.value);
        output.textContent = this.rangeText(control, range.value);
        this.update();
      });
    } else if (control.type === 'toggle') {
      const toggle = input as HTMLInputElement;
      toggle.type = 'checkbox';
      toggle.checked = Boolean(this.state!.values[control.key]);
      toggle.addEventListener('change', () => {
        this.state!.values[control.key] = toggle.checked;
        this.update();
      });
    } else {
      const select = input as HTMLSelectElement;
      for (const option of control.options) select.add(new Option(option, option));
      select.value = String(this.state!.values[control.key]);
      select.addEventListener('change', () => {
        this.state!.values[control.key] = select.value;
        this.update();
      });
    }
    return this.row(control.label, input, `fd-label-${control.key}`, control.type === 'range' ? output : undefined);
  }

  private rangeText(control: Range, value: string): string {
    return `${value}${control.unit ?? ''}`;
  }

  private restorePanelMode(): void {
    let mode: 'open' | 'collapsed' | 'hidden' = 'collapsed';
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored === 'open' || stored === 'collapsed' || stored === 'hidden') mode = stored;
    } catch {
      // Storage is optional. The dense collapsed state remains the default.
    }
    this.setPanelMode(mode, false);
  }

  private setPanelMode(mode: 'open' | 'collapsed' | 'hidden', persist = true): void {
    if (!this.panel) return;
    this.panel.classList.toggle('collapsed', mode === 'collapsed');
    this.panel.classList.toggle('hidden', mode === 'hidden');
    const button = this.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="collapse"]');
    if (button) {
      const expanded = mode === 'open';
      button.textContent = expanded ? '−' : '+';
      button.ariaLabel = expanded ? 'Panel einklappen' : 'Panel öffnen';
      button.ariaExpanded = String(expanded);
    }
    if (persist) {
      try { localStorage.setItem(this.storageKey, mode); } catch { /* Storage is optional. */ }
    }
  }

  private apply(): void { if (this.config && this.state) applyEffects(this.config, this.state); }

  private update(): void {
    if (!this.config || !this.state) return;
    this.apply();
    try {
      history.replaceState(null, '', stateUrl(this.config, this.state));
    } catch {
      this.feedback('URL unavailable');
    }
  }

  private async action(action?: string): Promise<void> {
    if (!action || !this.config || !this.state) return;
    if (action === 'collapse') this.setPanelMode(this.panel?.classList.contains('collapsed') ? 'open' : 'collapsed');
    if (action === 'hide') this.setPanelMode('hidden');
    if (action === 'reset') { this.state = decodeState(this.config, null); this.render(); this.update(); }
    if (action === 'permalink') await this.copy(stateUrl(this.config, this.state));
    if (action === 'json') await this.copy(recipe(this.config, this.state));
    if (action === 'ts') await this.copy(typescriptRecipe(this.config, this.state));
    if (action === 'download') this.download(recipe(this.config, this.state));
  }

  private async copy(value: string): Promise<void> {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(value);
      this.feedback('Copied');
      return;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.cssText = 'position:fixed;inset:-9999px';
      document.body.append(textarea);
      textarea.select();
      const copied = typeof document.execCommand === 'function' && document.execCommand('copy');
      textarea.remove();
      this.feedback(copied ? 'Copied' : 'Copy unavailable');
    }
  }

  private feedback(message: string): void { if (this.status) this.status.textContent = message; }

  private download(value: string): void {
    const href = URL.createObjectURL(new Blob([value], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = href; anchor.download = `${this.config!.project}-devtools.json`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    this.feedback('Downloaded');
  }
}

export function defineDevtoolsElement(config: DevtoolsConfig): FoundationDevtoolsElement {
  if (!customElements.get('foundation-devtools')) customElements.define('foundation-devtools', FoundationDevtoolsElement);
  const element = document.createElement('foundation-devtools') as FoundationDevtoolsElement;
  queueMicrotask(() => element.configure(config));
  return element;
}
