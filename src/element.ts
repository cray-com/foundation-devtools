import {
  applyEffects,
  decodeState,
  recipe,
  changes,
  changesJson,
  agentBrief,
  initialState,
  resetBaseline,
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
  private selectedTarget: string | undefined;
  private compareMode: 'modified' | 'original' = 'modified';
  private targetFilter = '';
  private targetKind: 'all' | 'global' | 'section' = 'all';
  private pickerCleanup?: () => void;

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    if (!this.ready) this.build();
    document.addEventListener('keydown', this.recover);
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this.recover);
    this.pickerCleanup?.(); this.pickerCleanup = undefined;
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
        <footer><button data-action="reset">Reset</button><button data-action="pick">Pick section</button><button data-action="changes">Copy changes</button><button data-action="brief">Copy agent brief</button><button data-action="permalink">Permalink</button>
          <button data-action="json">JSON</button><button data-action="ts">TypeScript</button><button data-action="download">Download</button></footer>
      </section>`;
    this.panel = root.querySelector('.panel')!;
    this.status = root.querySelector('.status')!;
    root.addEventListener('click', (event) => { const target = event.target as HTMLElement; this.action(target.dataset.action, target.dataset.control); });
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
    const compare = document.createElement('div'); compare.className = 'compare';
    compare.innerHTML = '<button data-action="compare-original">Original</button><button data-action="compare-modified">Modified</button>';
    body.append(compare);
    if (this.config.targets?.length) {
      const map = document.createElement('nav'); map.className = 'map'; map.setAttribute('aria-label', 'Targets');
      const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Filter targets'; search.value = this.targetFilter; search.setAttribute('aria-label', 'Filter targets');
      search.addEventListener('input', () => { this.targetFilter = search.value; this.render(); }); map.append(search);
      for (const kind of ['all', 'global', 'section'] as const) { const tab = document.createElement('button'); tab.textContent = kind[0].toUpperCase() + kind.slice(1); tab.dataset.mapKind = kind; tab.setAttribute('aria-pressed', String(this.targetKind === kind)); tab.addEventListener('click', () => { this.targetKind = kind; this.render(); }); map.append(tab); }
      const diff = changes(this.config, this.state).changes;
      const matches = (key: string) => { const target = this.config!.targets!.find((item) => item.key === key); return key === 'all' || (this.targetKind === 'all' || target?.kind === this.targetKind) && (!this.targetFilter || (target?.label ?? key).toLowerCase().includes(this.targetFilter.toLowerCase())); };
      const all = ['all', ...this.config.targets.map((target) => target.key)].filter(matches);
      for (const key of all) {
        const target = key === 'all' ? undefined : this.config.targets.find((item) => item.key === key);
        const available = key === 'all' ? this.config.families.length + (this.config.controls ?? []).length : this.config.families.filter((item) => item.target === key).length + (this.config.controls ?? []).filter((item) => item.target === key).length;
        const changed = key === 'all' ? diff.length : diff.filter((item) => item.target === key).length;
        const button = document.createElement('button');
        button.textContent = `${key === 'all' ? 'All' : target!.label} (${available}/${changed})`;
        button.dataset.target = key;
        button.setAttribute('aria-pressed', String((this.selectedTarget ?? 'all') === key));
        button.addEventListener('click', () => {
          this.selectedTarget = key === 'all' ? undefined : key;
          if (target?.kind === 'section') {
            const section = document.querySelector<HTMLElement>(`[data-fd-target="${CSS.escape(key)}"]`);
            section?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
            if (section) { const previous = section.style.outline; section.style.outline = '2px solid #8f98a3'; window.setTimeout(() => { section.style.outline = previous; }, 500); }
          }
          this.render();
        });
        map.append(button);
      }
      body.append(map);
      if (this.selectedTarget) { const resetTarget = document.createElement('button'); resetTarget.textContent = 'Reset target'; resetTarget.dataset.action = 'reset-target'; resetTarget.dataset.control = this.selectedTarget; body.append(resetTarget); }
      if (all.length === 0) { const empty = document.createElement('p'); empty.textContent = 'Keine Targets gefunden.'; map.append(empty); }
    }
    let rendered = 0;
    for (const family of this.config.families) {
      if (this.selectedTarget && family.target !== this.selectedTarget) continue;
      rendered++;
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
    for (const control of this.config.controls ?? []) { if (!this.selectedTarget || control.target === this.selectedTarget) { rendered++; body.append(this.control(control)); } }
    if (this.selectedTarget && rendered === 0) { const empty = document.createElement('p'); empty.textContent = 'Keine Controls für dieses Target.'; body.append(empty); }
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
      for (const option of control.options) select.add(new Option(typeof option === 'string' ? option : option.label, typeof option === 'string' ? option : option.value));
      select.value = String(this.state!.values[control.key]);
      select.addEventListener('change', () => {
        this.state!.values[control.key] = select.value;
        this.update();
      });
    }
    const row = this.row(control.label, input, `fd-label-${control.key}`, control.type === 'range' ? output : undefined);
    const reset = document.createElement('button'); reset.textContent = 'Reset'; reset.dataset.action = 'reset-control'; reset.dataset.control = control.key; row.append(reset);
    return row;
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

  private apply(): void { if (this.config && this.state) applyEffects(this.config, this.compareMode === 'modified' ? this.state : initialState(this.config)); }

  private update(): void {
    if (!this.config || !this.state) return;
    this.apply();
    try {
      history.replaceState(null, '', stateUrl(this.config, this.state));
    } catch {
      this.feedback('URL unavailable');
    }
  }

  private async action(action?: string, controlKey?: string): Promise<void> {
    if (!action || !this.config || !this.state) return;
    if (action === 'collapse') this.setPanelMode(this.panel?.classList.contains('collapsed') ? 'open' : 'collapsed');
    if (action === 'hide') this.setPanelMode('hidden');
    if (action === 'reset') { this.state = initialState(this.config); this.render(); this.update(); }
    if (action === 'reset-control' && controlKey) {
      const control = this.config.controls?.find((item) => item.key === controlKey);
      if (control) { this.state.values[controlKey] = initialState(this.config).values[controlKey]; this.render(); this.update(); }
    }
    if (action === 'reset-target' && controlKey) { this.state = resetBaseline(this.config, this.state, controlKey); this.render(); this.update(); }
    if (action === 'changes') await this.copy(changesJson(this.config, this.state));
    if (action === 'brief') await this.copy(agentBrief(this.config, this.state));
    if (action === 'pick') { this.feedback('Pick a registered section or press Escape'); this.startPicker(); }
    if (action === 'compare-original') { this.compareMode = 'original'; this.apply(); }
    if (action === 'compare-modified') { this.compareMode = 'modified'; this.apply(); }
    if (action === 'permalink') await this.copy(stateUrl(this.config, this.state));
    if (action === 'json') await this.copy(recipe(this.config, this.state));
    if (action === 'ts') await this.copy(typescriptRecipe(this.config, this.state));
    if (action === 'download') this.download(recipe(this.config, this.state));
  }

  private startPicker(): void {
    this.pickerCleanup?.();
    if (!this.config?.targets) return;
    const keys = this.config.targets.filter((target) => target.kind === 'section').map((target) => target.key);
    const elements = keys.flatMap((key) => Array.from(document.querySelectorAll<HTMLElement>(`[data-fd-target="${CSS.escape(key)}"]`)));
    const old = new Map<HTMLElement, string>(); let hovered: HTMLElement | undefined;
    const listeners = new Map<HTMLElement, { enter: () => void; leave: () => void; focus: () => void }>();
    const clearMark = () => { if (hovered) { hovered.style.outline = old.get(hovered) ?? ''; hovered = undefined; } };
    const mark = (element: HTMLElement) => { clearMark(); old.set(element, element.style.outline); hovered = element; element.style.outline = '2px solid #8f98a3'; };
    const cleanup = () => { clearMark(); elements.forEach((element) => { element.removeEventListener('click', onClick); const listener = listeners.get(element); if (listener) { element.removeEventListener('pointerenter', listener.enter); element.removeEventListener('pointerleave', listener.leave); element.removeEventListener('focus', listener.focus); } }); document.removeEventListener('keydown', onKey); this.pickerCleanup = undefined; };
    const onClick = (event: Event) => { const element = event.currentTarget as HTMLElement; event.preventDefault(); event.stopPropagation(); this.selectedTarget = element.dataset.fdTarget; cleanup(); this.render(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') cleanup(); };
    elements.forEach((element) => { const enter = () => mark(element); const leave = () => { if (hovered === element) clearMark(); }; const focus = () => mark(element); listeners.set(element, { enter, leave, focus }); element.addEventListener('pointerenter', enter); element.addEventListener('pointerleave', leave); element.addEventListener('focus', focus); element.addEventListener('click', onClick); });
    document.addEventListener('keydown', onKey); this.pickerCleanup = cleanup;
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
