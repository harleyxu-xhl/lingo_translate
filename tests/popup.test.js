const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.listeners = {};
    this.className = '';
    this.id = '';
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.type = '';
    this.disabled = false;
    this.parentNode = null;
    this.nextSibling = null;
    this.options = [];
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    if (this.tagName === 'SELECT' && child.tagName === 'OPTION') {
      this.options.push(child);
      if (!this.value) this.value = child.value;
    }
    return child;
  }

  insertBefore(child, nextSibling) {
    child.parentNode = this;
    const index = this.children.indexOf(nextSibling);
    if (index === -1) {
      this.children.push(child);
    } else {
      this.children.splice(index, 0, child);
    }
    return child;
  }

  addEventListener(type, listener) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(listener);
  }

  dispatchEvent(event) {
    event.target = this;
    for (const listener of this.listeners[event.type] || []) {
      listener(event);
    }
  }

  click() {
    this.dispatchEvent({ type: 'click', stopPropagation() {} });
  }

  contains(target) {
    return target === this || this.children.some(child => child.contains?.(target));
  }

  querySelectorAll() {
    return [];
  }

  classList = {
    add() {},
    remove() {},
    contains() {
      return false;
    }
  };

  focus() {}
}

function createPopupRuntime(response, storageSettings = {}) {
  const elements = {};
  const ids = [
    'apiProvider',
    'model',
    'customModel',
    'customModelGroup',
    'apiKey',
    'baseUrl',
    'baseUrlGroup',
    'apiKeyLabel',
    'helpText',
    'poweredBadge',
    'toggleBtn',
    'promptStyle',
    'saveBtn',
    'testBtn',
    'themeToggle'
  ];

  for (const id of ids) {
    const element = new Element(id === 'apiProvider' || id === 'model' || id === 'promptStyle' ? 'select' : 'div');
    element.id = id;
    elements[id] = element;
  }

  elements.apiProvider.parentNode = new Element('div');
  elements.model.parentNode = new Element('div');
  elements.promptStyle.parentNode = new Element('div');
  elements.apiKey.value = 'test-key';
  elements.baseUrl.value = 'https://token-plan-cn.xiaomimimo.com/v1';

  const directOption = new Element('option');
  directOption.value = 'direct';
  directOption.textContent = '直译';
  elements.promptStyle.appendChild(directOption);

  const documentListeners = {};
  const document = {
    body: {
      setAttribute() {}
    },
    addEventListener(type, listener) {
      documentListeners[type] = documentListeners[type] || [];
      documentListeners[type].push(listener);
    },
    createElement(tagName) {
      return new Element(tagName);
    },
    getElementById(id) {
      return elements[id];
    },
    querySelectorAll() {
      return [];
    }
  };

  const sentMessages = [];
  const savedValues = [];
  let nextTimerId = 1;
  const timers = [];
  const context = {
    console,
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    setTimeout(callback) {
      const timerId = nextTimerId;
      nextTimerId += 1;
      timers.push({ id: timerId, callback });
      return timerId;
    },
    clearTimeout(timerId) {
      const index = timers.findIndex(timer => timer.id === timerId);
      if (index !== -1) timers.splice(index, 1);
    },
    window: {
      matchMedia() {
        return { matches: false };
      }
    },
    document,
    chrome: {
      runtime: {
        lastError: null,
        sendMessage(message, callback) {
          sentMessages.push(message);
          callback(response);
        }
      },
      storage: {
        local: {
          get(keys, callback) {
            callback({
              apiProvider: 'mimo',
              apiKey: 'test-key',
              baseUrl: elements.baseUrl.value,
              ...storageSettings
            });
          },
          set(value, callback) {
            savedValues.push(value);
            callback?.();
          }
        }
      }
    }
  };

  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '..', 'popup.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'popup.js' });
  for (const listener of documentListeners.DOMContentLoaded || []) {
    listener();
  }

  function runTimers() {
    while (timers.length) {
      const timer = timers.shift();
      timer.callback();
    }
  }

  return { elements, sentMessages, savedValues, runTimers };
}

test('test connection displays backend error detail', () => {
  const { elements, runTimers } = createPopupRuntime({
    success: false,
    error: 'Invalid API Key'
  });

  elements.testBtn.click();
  runTimers();

  assert.match(elements.testBtn.innerHTML, /Invalid API Key/);
});

test('test connection sends custom model when custom model option is selected', () => {
  const { elements, sentMessages, runTimers } = createPopupRuntime({ success: true });

  elements.model.value = '__custom__';
  elements.model.dispatchEvent({ type: 'change' });
  elements.customModel.value = 'mimo-token-plan-model';
  elements.testBtn.click();
  runTimers();

  assert.equal(sentMessages.at(-1).model, 'mimo-token-plan-model');
});

test('saved custom model is restored into custom model input', () => {
  const { elements } = createPopupRuntime({ success: true }, {
    model: 'mimo-token-plan-model',
    customModel: 'mimo-token-plan-model'
  });

  assert.equal(elements.model.value, '__custom__');
  assert.equal(elements.customModel.value, 'mimo-token-plan-model');
  assert.equal(elements.customModelGroup.style.display, 'flex');
});

test('base URL input autosaves without clicking save', () => {
  const { elements, savedValues, runTimers } = createPopupRuntime({ success: true });

  elements.baseUrl.value = 'https://token-plan-cn.xiaomimimo.com/v1';
  elements.baseUrl.dispatchEvent({ type: 'input' });
  runTimers();

  assert.equal(savedValues.at(-1).baseUrl, 'https://token-plan-cn.xiaomimimo.com/v1');
});

test('save button persists current form state immediately', () => {
  const { elements, savedValues, runTimers } = createPopupRuntime({ success: true });

  elements.baseUrl.value = 'https://token-plan-cn.xiaomimimo.com/v1';
  elements.model.value = '__custom__';
  elements.model.dispatchEvent({ type: 'change' });
  elements.customModel.value = 'mimo-v2.5';
  elements.saveBtn.click();
  runTimers();

  assert.equal(savedValues.at(-1).baseUrl, 'https://token-plan-cn.xiaomimimo.com/v1');
  assert.equal(savedValues.at(-1).model, 'mimo-v2.5');
  assert.equal(savedValues.at(-1).customModel, 'mimo-v2.5');
});
