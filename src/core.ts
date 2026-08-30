export type Metadata = {
  fixture?: string;
  tenant?: string;
  locale?: string;
  route?: string;
  revision?: string;
};

export type Effect = {
  scope: string;
  variable?: string;
  attribute?: string;
};

export type Target = {
  key: string;
  label: string;
  kind: 'global' | 'section';
};

export type SelectOption = string | { value: string; label: string };

export type Range = {
  type: 'range';
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  default: number;
  effect: Effect;
  target?: string;
  classification?: 'token' | 'local';
};

export type Select = {
  type: 'select';
  key: string;
  label: string;
  options: readonly SelectOption[];
  default: string;
  effect: Effect;
  target?: string;
  classification?: 'token' | 'local';
};

export type Toggle = {
  type: 'toggle';
  key: string;
  label: string;
  default: boolean;
  effect: Effect;
  target?: string;
  classification?: 'token' | 'local';
};

export type Control = Range | Select | Toggle;
export type ControlValue = string | number | boolean;
export type Variant = {
  name: string;
  label?: string;
  defaults?: Record<string, ControlValue>;
};
export type Family = {
  key: string;
  label: string;
  variants: readonly Variant[];
  default?: string;
  effect?: Effect;
  target?: string;
};
export type DevtoolsConfig = {
  project: string;
  families: readonly Family[];
  controls?: readonly Control[];
  targets?: readonly Target[];
  metadata?: Metadata;
  queryKey?: string;
};
export type DevtoolsState = {
  families: Record<string, string>;
  values: Record<string, ControlValue>;
};

const keyPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const scopePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const attributePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const variablePattern = /^--[a-z][a-z0-9-]*$/;
const unitPattern = /^(?:[a-z%]+)?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(`Invalid devtools config: ${message}`);
}

function validateEffect(effect: unknown): asserts effect is Effect {
  if (!isRecord(effect) || !scopePattern.test(String(effect.scope))) {
    fail('effect scope');
  }
  const hasVariable = typeof effect.variable === 'string';
  const hasAttribute = typeof effect.attribute === 'string';
  if (hasVariable === hasAttribute || (hasVariable && !variablePattern.test(effect.variable as string)) ||
      (hasAttribute && !attributePattern.test(effect.attribute as string))) {
    fail('effect target');
  }
}

export function validateConfig(input: unknown): DevtoolsConfig {
  if (!isRecord(input) || typeof input.project !== 'string' || input.project.trim().length === 0 ||
      !Array.isArray(input.families)) {
    fail('project and families are required');
  }
  if (input.controls !== undefined && !Array.isArray(input.controls)) fail('controls');
  if (input.queryKey !== undefined && (typeof input.queryKey !== 'string' || !keyPattern.test(input.queryKey))) {
    fail('query key');
  }
  if (input.targets !== undefined && !Array.isArray(input.targets)) fail('targets');
  const targets: Target[] = [];
  const targetKeys = new Set<string>();
  for (const targetValue of (Array.isArray(input.targets) ? input.targets : [])) {
    if (!isRecord(targetValue) || typeof targetValue.key !== 'string' || !keyPattern.test(targetValue.key) ||
        targetKeys.has(targetValue.key) || typeof targetValue.label !== 'string' ||
        (targetValue.kind !== 'global' && targetValue.kind !== 'section')) fail('target');
    targetKeys.add(targetValue.key); targets.push(targetValue as unknown as Target);
  }
  if (input.metadata !== undefined) {
    if (!isRecord(input.metadata) || Object.values(input.metadata).some((value) => value !== undefined && typeof value !== 'string')) {
      fail('metadata');
    }
  }

  const names = new Set<string>();
  const families: Family[] = [];
  for (const familyValue of input.families) {
    if (!isRecord(familyValue) || typeof familyValue.key !== 'string' ||
        !keyPattern.test(familyValue.key) || names.has(familyValue.key) ||
        typeof familyValue.label !== 'string' || !Array.isArray(familyValue.variants) ||
        familyValue.variants.length === 0) {
      fail('family');
    }
    names.add(familyValue.key);
    const variantNames = new Set<string>();
    const variants: Variant[] = [];
    for (const variantValue of familyValue.variants) {
      if (!isRecord(variantValue) || typeof variantValue.name !== 'string' ||
          !keyPattern.test(variantValue.name) || variantNames.has(variantValue.name)) {
        fail('variant');
      }
      variantNames.add(variantValue.name);
      if (variantValue.defaults !== undefined && !isRecord(variantValue.defaults)) {
        fail('variant defaults');
      }
      variants.push(variantValue as unknown as Variant);
    }
    if (familyValue.default !== undefined &&
        (typeof familyValue.default !== 'string' || !variantNames.has(familyValue.default))) {
      fail('family default');
    }
    if (familyValue.effect !== undefined) validateEffect(familyValue.effect);
    if (familyValue.target !== undefined && (typeof familyValue.target !== 'string' || !targetKeys.has(familyValue.target))) fail('family target');
    families.push(familyValue as unknown as Family);
  }

  const controls: Control[] = [];
  for (const controlValue of (Array.isArray(input.controls) ? input.controls : [])) {
    if (!isRecord(controlValue) || typeof controlValue.key !== 'string' ||
        !keyPattern.test(controlValue.key) || names.has(controlValue.key) ||
        typeof controlValue.label !== 'string') {
      fail('control key');
    }
    names.add(controlValue.key);
    validateEffect(controlValue.effect);
    if (controlValue.target !== undefined && (typeof controlValue.target !== 'string' || !targetKeys.has(controlValue.target))) fail('control target');
    if (controlValue.classification !== undefined && controlValue.classification !== 'token' && controlValue.classification !== 'local') fail('control classification');
    if (controlValue.type === 'range') {
      const { min, max, step = 1, unit = '' } = controlValue as {
        min: unknown;
        max: unknown;
        step?: unknown;
        unit?: unknown;
      };
      if (typeof min !== 'number' || typeof max !== 'number' || typeof step !== 'number' ||
          !Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) ||
          min >= max || step <= 0 || typeof controlValue.default !== 'number' ||
          !Number.isFinite(controlValue.default) || controlValue.default < min || controlValue.default > max ||
          typeof unit !== 'string' || !unitPattern.test(unit)) {
        fail('range');
      }
    } else if (controlValue.type === 'select') {
      if (!Array.isArray(controlValue.options) || controlValue.options.length === 0 ||
          controlValue.options.some((option) => (typeof option !== 'string' && !isRecord(option)) ||
            !isValidOption(option) || optionValue(option as SelectOption).length === 0) ||
          new Set(controlValue.options.map((option) => optionValue(option))).size !== controlValue.options.length ||
          typeof controlValue.default !== 'string' || !controlValue.options.some((option) => optionValue(option) === controlValue.default)) {
        fail('select');
      }
    } else if (controlValue.type === 'toggle') {
      if (typeof controlValue.default !== 'boolean') fail('toggle');
    } else {
      fail('control type');
    }
    controls.push(controlValue as unknown as Control);
  }

  const config = { ...input, families, controls } as unknown as DevtoolsConfig;
  for (const family of config.families) {
    for (const variant of family.variants) {
      for (const controlKey of Object.keys(variant.defaults ?? {})) {
        const control = controls.find((item) => item.key === controlKey);
        const value = variant.defaults?.[controlKey];
        if (!control || !isValidValue(control, value)) fail('variant default');
      }
    }
  }
  return config;
}

function isValidOption(option: unknown): option is SelectOption {
  return typeof option === 'string' ? option.length > 0 : isRecord(option) && typeof option.value === 'string' && option.value.length > 0 && typeof option.label === 'string' && option.label.length > 0;
}

function optionValue(option: SelectOption): string { return typeof option === 'string' ? option : option.value; }

function isValidValue(control: Control, value: unknown): value is ControlValue {
  if (control.type === 'range') return typeof value === 'number' && Number.isFinite(value) && value >= control.min && value <= control.max;
  if (control.type === 'select') return typeof value === 'string' && control.options.some((option) => optionValue(option) === value);
  return typeof value === 'boolean';
}

function variantDefaults(config: DevtoolsConfig, families: Record<string, string>): Record<string, ControlValue> {
  const values: Record<string, ControlValue> = {};
  for (const family of config.families) {
    const variant = family.variants.find((item) => item.name === families[family.key]);
    Object.assign(values, variant?.defaults ?? {});
  }
  return values;
}

export function initialState(config: DevtoolsConfig): DevtoolsState {
  const families: Record<string, string> = {};
  const values: Record<string, ControlValue> = {};
  for (const family of config.families) families[family.key] = family.default ?? family.variants[0].name;
  for (const control of config.controls ?? []) values[control.key] = control.default;
  Object.assign(values, variantDefaults(config, families));
  return { families, values };
}

export function validateState(config: DevtoolsConfig, input: unknown): DevtoolsState {
  const base = initialState(config);
  if (!isRecord(input)) return base;
  const candidate = input as Partial<DevtoolsState>;
  for (const family of config.families) {
    const selected = candidate.families?.[family.key];
    if (typeof selected === 'string' && family.variants.some((variant) => variant.name === selected)) {
      base.families[family.key] = selected;
    }
  }
  Object.assign(base.values, variantDefaults(config, base.families));
  for (const control of config.controls ?? []) {
    const value = candidate.values?.[control.key];
    if (isValidValue(control, value)) base.values[control.key] = value;
  }
  return base;
}

export function encodeState(config: DevtoolsConfig, state: DevtoolsState): string {
  return JSON.stringify(validateState(config, state));
}

export function decodeState(config: DevtoolsConfig, encoded: string | null): DevtoolsState {
  if (!encoded) return initialState(config);
  try {
    return validateState(config, JSON.parse(encoded));
  } catch {
    return initialState(config);
  }
}

export function stateUrl(config: DevtoolsConfig, state: DevtoolsState, url?: string): string {
  const result = new URL(url ?? (typeof location === 'undefined' ? 'http://localhost/' : location.href));
  result.searchParams.set(config.queryKey ?? 'fd', encodeState(config, state));
  return result.toString();
}

function kebab(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

export function formatCssValue(control: Range, value: number): string {
  const precision = control.step ? Math.max(0, (String(control.step).split('.')[1] ?? '').length) : 0;
  const number = Number(value.toFixed(precision));
  return `${number}${control.unit ?? ''}`;
}

function scopedElements(root: ParentNode, scope: string, target?: string, targets?: readonly Target[]): HTMLElement[] {
  const targetDefinition = target ? targets?.find((item) => item.key === target) : undefined;
  const base = target && targetDefinition?.kind === 'section' ? root.querySelector<HTMLElement>(`[data-fd-target="${CSS.escape(target)}"]`) : root;
  if (!base) return [];
  const selector = `[data-fd-scope="${CSS.escape(scope)}"]`;
  const descendants = Array.from(base.querySelectorAll<HTMLElement>(selector));
  return base instanceof HTMLElement && base.matches(selector) ? [base, ...descendants] : descendants;
}

export function applyEffects(config: DevtoolsConfig, state: DevtoolsState, root: ParentNode = document): void {
  for (const control of config.controls ?? []) {
    for (const element of scopedElements(root, control.effect.scope, control.target, config.targets)) {
      const value = state.values[control.key];
      if (control.effect.variable) {
        const cssValue = control.type === 'range' ? formatCssValue(control, value as number) : String(value);
        element.style.setProperty(control.effect.variable, cssValue);
      } else if (control.effect.attribute) {
        element.setAttribute(`data-${control.effect.attribute}`, String(value));
      }
    }
  }
  for (const family of config.families) {
    const scope = family.effect?.scope ?? family.key;
    for (const element of scopedElements(root, scope, family.target, config.targets)) {
      if (family.effect?.variable) element.style.setProperty(family.effect.variable, state.families[family.key]);
      else if (family.effect?.attribute) element.setAttribute(`data-${family.effect.attribute}`, state.families[family.key]);
      else element.setAttribute(`data-fd-variant-${kebab(family.key)}`, state.families[family.key]);
    }
  }
}

export type ChangeEntry = {
  key: string;
  label: string;
  kind: 'family' | 'control';
  from: ControlValue;
  to: ControlValue;
  target?: string;
  targetKind?: 'global' | 'section';
  classification?: 'token' | 'local';
};
export type Changes = {
  project: string;
  metadata?: Metadata;
  changes: ChangeEntry[];
  count: number;
};

/** Pure, deterministic comparison against the initial (or supplied) baseline. */
export function changes(config: DevtoolsConfig, state: DevtoolsState, baseline: DevtoolsState = initialState(config)): Changes {
  const current = validateState(config, state);
  const base = validateState(config, baseline);
  const targetMap = new Map((config.targets ?? []).map((target) => [target.key, target]));
  const result: ChangeEntry[] = [];
  for (const family of config.families) {
    const from = base.families[family.key], to = current.families[family.key];
    if (from !== to) { const target = family.target ? targetMap.get(family.target) : undefined;
      result.push({ key: family.key, label: family.label, kind: 'family', from, to, ...(family.target ? { target: family.target, targetKind: target?.kind } : {}) }); }
  }
  for (const control of config.controls ?? []) {
    const from = base.values[control.key], to = current.values[control.key];
    if (from !== to) { const target = control.target ? targetMap.get(control.target) : undefined;
      result.push({ key: control.key, label: control.label, kind: 'control', from, to, ...(control.target ? { target: control.target, targetKind: target?.kind } : {}), ...(control.classification ? { classification: control.classification } : {}) }); }
  }
  return { project: config.project, ...(config.metadata ? { metadata: config.metadata } : {}), changes: result, count: result.length };
}

export function changesJson(config: DevtoolsConfig, state: DevtoolsState, baseline?: DevtoolsState): string {
  return JSON.stringify(changes(config, state, baseline), null, 2);
}

export function agentBrief(config: DevtoolsConfig, state: DevtoolsState, baseline?: DevtoolsState): string {
  const diff = changes(config, state, baseline);
  if (!diff.count) return `# ${config.project} changes\n\nNo changes.`;
  const lines = diff.changes.map((item) => `- **${item.label}** (${item.kind}${item.target ? `, target: ${item.target}` : ''}${item.classification ? `, ${item.classification}` : ''}): \`${String(item.from)}\` → \`${String(item.to)}\``);
  return `# ${config.project} changes\n\n${lines.join('\n')}`;
}

/** Return a fresh state baseline; useful for scoped reset controls. */
export function resetBaseline(config: DevtoolsConfig, state: DevtoolsState, target?: string): DevtoolsState {
  const result = validateState(config, state);
  const baseline = initialState(config);
  if (!target) return baseline;
  for (const family of config.families) if (family.target === target) {
    result.families[family.key] = baseline.families[family.key];
    // A reset must also clear defaults from the previously selected variant.
    const variantKeys = new Set(family.variants.flatMap((variant) => Object.keys(variant.defaults ?? {})));
    for (const key of variantKeys) result.values[key] = baseline.values[key];
  }
  for (const control of config.controls ?? []) if (control.target === target) result.values[control.key] = baseline.values[control.key];
  return result;
}

export function recipe(config: DevtoolsConfig, state: DevtoolsState): string {
  return JSON.stringify({
    project: config.project,
    config,
    state: validateState(config, state),
  }, null, 2);
}

export function typescriptRecipe(config: DevtoolsConfig, state: DevtoolsState): string {
  return `import { defineDevtoolsConfig, validateState } from '@cray-com/foundation-devtools';\n\nconst config = defineDevtoolsConfig(${JSON.stringify(config, null, 2)});\nconst state = validateState(config, ${JSON.stringify(validateState(config, state), null, 2)});\n\nexport { config, state };\n`;
}

export function defineDevtoolsConfig(config: DevtoolsConfig): DevtoolsConfig {
  return validateConfig(config);
}
