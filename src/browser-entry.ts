import { defineDevtoolsElement } from './element.js';

const configScript = document.querySelector('[data-fd-config-json]');
const host = document.querySelector('foundation-devtools[data-fd-config]');

if (configScript && host) {
  const config = JSON.parse(configScript.textContent || '{}');
  host.replaceWith(defineDevtoolsElement(config));
  configScript.remove();
}
