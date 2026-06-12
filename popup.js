const PROVIDERS = {
  gemini: {
    name: "Google Gemini",
    badgeText: "Gemini",
    keyLabel: "Gemini API Key",
    helpHtml: '在 <a href="https://aistudio.google.com/" target="_blank">Google AI Studio</a> 免费获取',
    models: [
      { value: "gemini-2.5-flash", label: "gemini-2.5-flash (推荐)" },
      { value: "gemini-1.5-flash", label: "gemini-1.5-flash" }
    ]
  },
  openai: {
    name: "OpenAI",
    badgeText: "OpenAI",
    keyLabel: "OpenAI API Key",
    helpHtml: '在 <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a> 获取',
    supportsBaseUrl: true,
    models: [
      { value: "gpt-4o-mini", label: "gpt-4o-mini (推荐 - 高性价比)" },
      { value: "gpt-4o", label: "gpt-4o (旗舰)" },
      { value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
      { value: "gpt-4.1-nano", label: "gpt-4.1-nano (极速)" }
    ]
  },
  claude: {
    name: "Claude",
    badgeText: "Claude",
    keyLabel: "Anthropic API Key",
    helpHtml: '在 <a href="https://console.anthropic.com/settings/keys" target="_blank">Anthropic Console</a> 获取',
    models: [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (推荐)" },
      { value: "claude-haiku-4-20250414", label: "Claude Haiku 4 (极速)" }
    ]
  },
  deepseek: {
    name: "DeepSeek",
    badgeText: "DeepSeek",
    keyLabel: "DeepSeek API Key",
    helpHtml: '在 <a href="https://platform.deepseek.com/api_keys" target="_blank">DeepSeek Platform</a> 获取',
    supportsBaseUrl: true,
    models: [
      { value: "deepseek-chat", label: "deepseek-chat (推荐)" },
      { value: "deepseek-reasoner", label: "deepseek-reasoner (强推理)" }
    ]
  },
  glm: {
    name: "智谱 GLM",
    badgeText: "GLM",
    keyLabel: "智谱 API Key",
    helpHtml: '在 <a href="https://open.bigmodel.cn/usercenter/apikeys" target="_blank">智谱开放平台</a> 获取',
    supportsBaseUrl: true,
    models: [
      { value: "glm-4-flash", label: "glm-4-flash (推荐 - 免费)" },
      { value: "glm-4-plus", label: "glm-4-plus (旗舰)" },
      { value: "glm-4-long", label: "glm-4-long (长文本)" }
    ]
  },
  kimi: {
    name: "Kimi",
    badgeText: "Kimi",
    keyLabel: "Moonshot API Key",
    helpHtml: '在 <a href="https://platform.moonshot.cn/console/api-keys" target="_blank">Moonshot Platform</a> 获取',
    supportsBaseUrl: true,
    models: [
      { value: "moonshot-v1-8k", label: "moonshot-v1-8k (推荐)" },
      { value: "moonshot-v1-32k", label: "moonshot-v1-32k" },
      { value: "moonshot-v1-128k", label: "moonshot-v1-128k (长文本)" }
    ]
  },
  minimax: {
    name: "MiniMax",
    badgeText: "MiniMax",
    keyLabel: "MiniMax API Key",
    helpHtml: '在 <a href="https://platform.minimaxi.com/user-center/basic-information/interface-key" target="_blank">MiniMax Platform</a> 获取',
    supportsBaseUrl: true,
    models: [
      { value: "MiniMax-Text-01", label: "MiniMax-Text-01 (推荐)" }
    ]
  },
  mimo: {
    name: "小米 MiMo",
    badgeText: "MiMo",
    keyLabel: "MiMo API Key",
    helpHtml: '在 <a href="https://platform.xiaomimimo.com/" target="_blank">小米大模型开放平台</a> 获取',
    supportsBaseUrl: true,
    models: [
      { value: "mimo-v2-flash", label: "mimo-v2-flash (推荐 - 高性价比)" },
      { value: "mimo-v2.5-pro", label: "mimo-v2.5-pro (旗舰)" },
      { value: "mimo-v2.5", label: "mimo-v2.5" }
    ]
  }
};

const CUSTOM_MODEL_VALUE = '__custom__';

document.addEventListener('DOMContentLoaded', () => {
  const apiProviderSelect = document.getElementById('apiProvider');
  const modelSelect = document.getElementById('model');
  const customModelInput = document.getElementById('customModel');
  const customModelGroup = document.getElementById('customModelGroup');
  const apiKeyInput = document.getElementById('apiKey');
  const baseUrlInput = document.getElementById('baseUrl');
  const baseUrlGroup = document.getElementById('baseUrlGroup');
  const apiKeyLabel = document.getElementById('apiKeyLabel');
  const helpText = document.getElementById('helpText');
  const poweredBadge = document.getElementById('poweredBadge');
  const toggleBtn = document.getElementById('toggleBtn');
  const promptStyleSelect = document.getElementById('promptStyle');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const themeToggle = document.getElementById('themeToggle');
  let isLoadingSettings = true;

  // --- Theme Management ---
  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    chrome.storage.local.set({ theme });
  }

  function initTheme() {
    chrome.storage.local.get(['theme'], (result) => {
      if (result.theme) {
        applyTheme(result.theme);
      } else {
        // Default to system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
      }
    });
  }

  themeToggle.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  initTheme();

  // --- Custom Select Wrapper Helper ---
  function convertToCustomSelect(nativeSelect) {
    // 1. Hide the native select
    nativeSelect.style.display = 'none';
    
    // 2. Create the custom container
    const container = document.createElement('div');
    container.className = 'custom-select-container';
    container.id = `custom-select-${nativeSelect.id}`;
    
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.tabIndex = 0; // make focusable
    
    const textSpan = document.createElement('span');
    textSpan.className = 'custom-select-text';
    
    const arrowSpan = document.createElement('span');
    arrowSpan.className = 'custom-select-arrow';
    
    trigger.appendChild(textSpan);
    trigger.appendChild(arrowSpan);
    container.appendChild(trigger);
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-select-options';
    container.appendChild(optionsContainer);
    
    // Insert the container after the native select
    nativeSelect.parentNode.insertBefore(container, nativeSelect.nextSibling);
    
    // Define refresh function to rebuild options from the native select
    function refresh() {
      optionsContainer.innerHTML = '';
      
      Array.from(nativeSelect.options).forEach(opt => {
        const text = opt.textContent;
        const index = text.search(/[\(（]/);
        const short = index !== -1 ? text.substring(0, index).trim() : text;
        
        // Save metadata on the option element in native select
        opt.dataset.shortText = short;
        opt.dataset.fullText = text;
        
        const customOpt = document.createElement('div');
        customOpt.className = 'custom-select-option';
        customOpt.textContent = text; // dropdown always shows full text
        customOpt.dataset.value = opt.value;
        
        if (opt.value === nativeSelect.value) {
          customOpt.classList.add('selected');
          textSpan.textContent = short; // trigger always shows short text
        }
        
        customOpt.addEventListener('click', (e) => {
          e.stopPropagation();
          nativeSelect.value = opt.value;
          // Dispatch change event to native select
          nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          closeDropdown();
        });
        
        optionsContainer.appendChild(customOpt);
      });
      
      // Update selected value display in case index changed
      const selectedOpt = Array.from(nativeSelect.options).find(opt => opt.value === nativeSelect.value);
      if (selectedOpt && selectedOpt.dataset.shortText) {
        textSpan.textContent = selectedOpt.dataset.shortText;
      }
    }
    
    // Expose refresh on the native select
    nativeSelect.refreshDynamicOptions = refresh;
    
    // Dropdown open/close functions
    function toggleDropdown() {
      const isActive = container.classList.contains('active');
      if (isActive) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }
    
    function openDropdown() {
      // Close any other open custom selects first
      document.querySelectorAll('.custom-select-container.active').forEach(openContainer => {
        if (openContainer !== container) {
          openContainer.classList.remove('active');
        }
      });
      container.classList.add('active');
      trigger.focus();
    }
    
    function closeDropdown() {
      container.classList.remove('active');
    }
    
    // Event listeners
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });
    
    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        closeDropdown();
      }
    });
    
    // Keyboard navigation
    trigger.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        e.preventDefault();
        toggleDropdown();
      } else if (e.key === 'Escape' || e.key === 'Esc') {
        closeDropdown();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!container.classList.contains('active')) {
          openDropdown();
        } else {
          // Move selection down
          const selectedIdx = Array.from(nativeSelect.options).findIndex(opt => opt.value === nativeSelect.value);
          if (selectedIdx < nativeSelect.options.length - 1) {
            nativeSelect.selectedIndex = selectedIdx + 1;
            nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!container.classList.contains('active')) {
          openDropdown();
        } else {
          // Move selection up
          const selectedIdx = Array.from(nativeSelect.options).findIndex(opt => opt.value === nativeSelect.value);
          if (selectedIdx > 0) {
            nativeSelect.selectedIndex = selectedIdx - 1;
            nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });
    
    // Listen to value changes on the native select (in case it is programmatically changed)
    nativeSelect.addEventListener('change', () => {
      const customOpts = optionsContainer.querySelectorAll('.custom-select-option');
      customOpts.forEach(customOpt => {
        if (customOpt.dataset.value === nativeSelect.value) {
          customOpt.classList.add('selected');
          const opt = Array.from(nativeSelect.options).find(o => o.value === nativeSelect.value);
          if (opt && opt.dataset.shortText) {
            textSpan.textContent = opt.dataset.shortText;
          }
        } else {
          customOpt.classList.remove('selected');
        }
      });
    });
    
    // Initial run
    refresh();
  }

  // --- Dynamic Provider Select ---
  function populateProviderSelect() {
    apiProviderSelect.innerHTML = '';
    Object.keys(PROVIDERS).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = PROVIDERS[key].name;
      apiProviderSelect.appendChild(option);
    });
  }

  function providerSupportsCustomModel(providerKey) {
    return Boolean(PROVIDERS[providerKey]?.supportsBaseUrl);
  }

  function resolveModelValue() {
    if (modelSelect.value === CUSTOM_MODEL_VALUE) {
      return customModelInput.value.trim();
    }
    return modelSelect.value;
  }

  function collectSettings() {
    return {
      apiProvider: apiProviderSelect.value,
      model: resolveModelValue(),
      customModel: customModelInput.value.trim(),
      apiKey: apiKeyInput.value.trim(),
      baseUrl: baseUrlInput.value.trim(),
      promptStyle: promptStyleSelect.value
    };
  }

  function saveSettings(callback) {
    chrome.storage.local.set(collectSettings(), callback);
  }

  function scheduleAutoSave() {
    if (isLoadingSettings) return;
    saveSettings();
  }

  function updateCustomModelUI(providerKey) {
    const shouldShow = providerSupportsCustomModel(providerKey) && modelSelect.value === CUSTOM_MODEL_VALUE;
    customModelGroup.style.display = shouldShow ? 'flex' : 'none';
  }

  function updateProviderUI(providerKey, selectedModel = null) {
    const provider = PROVIDERS[providerKey];
    if (!provider) return;

    apiKeyLabel.textContent = provider.keyLabel;
    poweredBadge.textContent = provider.badgeText;
    helpText.innerHTML = provider.helpHtml;
    baseUrlGroup.style.display = provider.supportsBaseUrl ? 'flex' : 'none';

    modelSelect.innerHTML = '';
    provider.models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.value;
      option.textContent = model.label;
      modelSelect.appendChild(option);
    });
    if (providerSupportsCustomModel(providerKey)) {
      const option = document.createElement('option');
      option.value = CUSTOM_MODEL_VALUE;
      option.textContent = '自定义模型...';
      modelSelect.appendChild(option);
    }

    if (selectedModel) {
      const hasSavedModel = provider.models.some(model => model.value === selectedModel);
      const supportsCustomModel = providerSupportsCustomModel(providerKey);
      if (hasSavedModel) {
        modelSelect.value = selectedModel;
      } else if (supportsCustomModel) {
        modelSelect.value = CUSTOM_MODEL_VALUE;
        customModelInput.value = selectedModel;
      }
    }
    updateCustomModelUI(providerKey);

    // Refresh custom select options
    if (modelSelect.refreshDynamicOptions) {
      modelSelect.refreshDynamicOptions();
    }
  }

  // --- Load Saved Settings ---
  // Convert elements to custom selects
  convertToCustomSelect(apiProviderSelect);
  convertToCustomSelect(modelSelect);
  convertToCustomSelect(promptStyleSelect);

  populateProviderSelect();
  apiProviderSelect.refreshDynamicOptions();

  chrome.storage.local.get(['apiProvider', 'apiKey', 'model', 'customModel', 'promptStyle', 'baseUrl'], (result) => {
    const provider = result.apiProvider || 'gemini';
    apiProviderSelect.value = provider;

    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    if (result.baseUrl) {
      baseUrlInput.value = result.baseUrl;
    }
    if (result.customModel) {
      customModelInput.value = result.customModel;
    }
    if (result.promptStyle) {
      promptStyleSelect.value = result.promptStyle;
    }

    updateProviderUI(provider, result.model);
    
    // Refresh all custom select displays to match loaded values
    apiProviderSelect.refreshDynamicOptions();
    promptStyleSelect.refreshDynamicOptions();
    isLoadingSettings = false;
  });

  // --- Event Listeners ---
  apiProviderSelect.addEventListener('change', () => {
    updateProviderUI(apiProviderSelect.value);
    scheduleAutoSave();
  });

  modelSelect.addEventListener('change', () => {
    updateCustomModelUI(apiProviderSelect.value);
    scheduleAutoSave();
  });

  customModelInput.addEventListener('input', scheduleAutoSave);
  apiKeyInput.addEventListener('input', scheduleAutoSave);
  baseUrlInput.addEventListener('input', scheduleAutoSave);
  promptStyleSelect.addEventListener('change', scheduleAutoSave);

  toggleBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    if (isPassword) {
      toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    } else {
      toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    }
  });

  saveBtn.addEventListener('click', () => {
    saveBtn.disabled = true;
    showBtnStatus(saveBtn, '保存中...', 'loading');

    setTimeout(() => {
      saveSettings(() => {
        saveBtn.disabled = false;
        showBtnStatus(saveBtn, '保存成功', 'success');
      });
    }, 300);
  });

  testBtn.addEventListener('click', async () => {
    const apiProvider = apiProviderSelect.value;
    const model = resolveModelValue();
    const apiKey = apiKeyInput.value.trim();
    const baseUrl = baseUrlInput.value.trim();

    if (!apiKey) {
      showBtnStatus(testBtn, '请输入 Key', 'error');
      return;
    }
    if (!model) {
      showBtnStatus(testBtn, '请输入模型名', 'error');
      return;
    }

    testBtn.disabled = true;
    showBtnStatus(testBtn, '测试中...', 'loading');

    try {
      chrome.runtime.sendMessage(
        { type: 'TEST_API', apiProvider, apiKey, model, baseUrl },
        (response) => {
          testBtn.disabled = false;
          if (chrome.runtime.lastError) {
            showBtnStatus(testBtn, '通讯失败', 'error');
            return;
          }
          if (response && response.success) {
            showBtnStatus(testBtn, '连接成功', 'success');
          } else {
            showBtnStatus(testBtn, response?.error || '连接失败', 'error');
          }
        }
      );
    } catch (err) {
      testBtn.disabled = false;
      showBtnStatus(testBtn, '测试失败', 'error');
    }
  });

  function showBtnStatus(btn, msg, type) {
    const originalText = btn.id === 'testBtn' ? '测试连接' : '保存配置';
    if (type === 'success') {
      btn.innerHTML = `<svg class="checkmark-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>${msg}`;
    } else if (type === 'loading') {
      btn.innerHTML = `<svg class="spinner-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.78" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>${msg}`;
    } else if (type === 'error') {
      btn.innerHTML = `<svg class="error-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>${msg}`;
    } else {
      btn.textContent = msg;
    }
    btn.className = 'btn btn-status-' + type;
    if (type !== 'loading') {
      setTimeout(() => {
        btn.textContent = originalText;
        btn.className = 'btn btn-secondary';
      }, type === 'error' ? 5000 : 2500);
    }
  }

});
