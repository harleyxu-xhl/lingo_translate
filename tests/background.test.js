const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function createRuntime({ storageSettings = {}, fetchResponse = {} } = {}) {
  const requests = [];
  const listeners = [];
  const context = {
    console,
    URL,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: fetchResponse.ok ?? true,
        status: fetchResponse.status ?? 200,
        json: async () => fetchResponse.body ?? {
          choices: [{ message: { content: 'OK' } }]
        }
      };
    },
    chrome: {
      runtime: {
        onInstalled: { addListener() {} },
        onMessage: { addListener(listener) { listeners.push(listener); } }
      },
      contextMenus: { create() {}, onClicked: { addListener() {} } },
      commands: { onCommand: { addListener() {} } },
      tabs: { sendMessage: async () => {}, query() {} },
      notifications: { create() {} },
      storage: {
        local: {
          get(keys, callback) {
            callback(storageSettings);
          }
        }
      }
    }
  };

  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'background.js' });
  return { context, requests, listeners };
}

function sendRuntimeMessage(listener, request) {
  return new Promise((resolve) => {
    listener(request, {}, resolve);
  });
}

test('TEST_API uses custom OpenAI-compatible base URL', async () => {
  const { listeners, requests } = createRuntime();

  const response = await sendRuntimeMessage(listeners[0], {
    type: 'TEST_API',
    apiProvider: 'mimo',
    apiKey: 'test-key',
    model: 'mimo-v2-flash',
    baseUrl: 'https://token-plan.example.com/v1'
  });

  assert.equal(response.success, true);
  assert.equal(requests[0].url, 'https://token-plan.example.com/v1/chat/completions');
});

test('TRANSLATE uses stored custom Base URL when configured', async () => {
  const { listeners, requests } = createRuntime({
    storageSettings: {
      apiProvider: 'mimo',
      apiKey: 'test-key',
      model: 'mimo-v2-flash',
      promptStyle: 'direct',
      baseUrl: 'https://token-plan.example.com/v1/chat/completions'
    },
    fetchResponse: {
      body: { choices: [{ message: { content: 'hello' } }] }
    }
  });

  const response = await sendRuntimeMessage(listeners[0], {
    type: 'TRANSLATE',
    text: '你好'
  });

  assert.equal(response.success, true);
  assert.equal(response.translatedText, 'hello');
  assert.equal(requests[0].url, 'https://token-plan.example.com/v1/chat/completions');
});
