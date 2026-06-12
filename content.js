// Content script for in-place translation

// Inject CSS styles for the loader
const style = document.createElement('style');
style.textContent = `
  .quick-trans-loader-container {
    position: absolute;
    z-index: 2147483647;
    pointer-events: none;
    background: rgba(17, 17, 17, 0.94);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #f5f5f5;
    padding: 6px 12px;
    border-radius: 10px;
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
    transition: opacity 0.2s ease, transform 0.2s ease;
    backdrop-filter: blur(12px);
    transform: translateY(5px);
    opacity: 0;
  }
  
  .quick-trans-loader-container.show {
    opacity: 1;
    transform: translateY(0);
  }
  
  .quick-trans-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(59, 130, 246, 0.15);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: quick-trans-spin 0.8s linear infinite;
  }

  .quick-trans-error-icon {
    color: #ef4444;
    font-weight: bold;
  }
  
  @keyframes quick-trans-spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Recursive helper to traverse shadow DOM and find the actual leaf active element
function getActiveElement(root = document) {
  let activeEl = root.activeElement;
  if (!activeEl) return null;
  while (activeEl.shadowRoot && activeEl.shadowRoot.activeElement) {
    activeEl = activeEl.shadowRoot.activeElement;
  }
  return activeEl;
}

// Search recursively for an editable element (INPUT, TEXTAREA, or contenteditable)
// within the element or its open shadow roots.
function findNestedEditable(root) {
  if (!root) return null;
  
  const isInput = root.tagName === 'INPUT' || root.tagName === 'TEXTAREA';
  const isContentEditable = root.getAttribute && (root.getAttribute('contenteditable') === 'true' || root.isContentEditable);
  
  if (isInput || isContentEditable) {
    return root;
  }
  
  if (root.shadowRoot) {
    const found = findNestedEditable(root.shadowRoot);
    if (found) return found;
  }
  
  const childNodes = root.childNodes || [];
  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i];
    if (child.nodeType === Node.ELEMENT_NODE) {
      const found = findNestedEditable(child);
      if (found) return found;
    }
  }
  
  return null;
}

// Track the last right-clicked editable element to support context menu translation
let lastRightClickedElement = null;

document.addEventListener('contextmenu', (e) => {
  // Use composedPath to pierce through Shadow DOM boundaries
  const activeEl = e.composedPath()[0] || e.target;
  if (!activeEl) return;
  
  const isInput = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA';
  const isContentEditable = activeEl.getAttribute && (activeEl.getAttribute('contenteditable') === 'true' || activeEl.isContentEditable);
  
  if (isInput || isContentEditable) {
    lastRightClickedElement = activeEl;
  } else {
    // Traverse up to find parent contenteditable, crossing shadow roots via .host
    let parent = activeEl.parentElement || (activeEl.parentNode && activeEl.parentNode.host) || activeEl.parentNode;
    while (parent) {
      if (parent.getAttribute && (parent.getAttribute('contenteditable') === 'true' || parent.isContentEditable)) {
        lastRightClickedElement = parent;
        return;
      }
      parent = parent.parentElement || (parent.parentNode && parent.parentNode.host) || parent.parentNode;
    }
    lastRightClickedElement = null;
  }
});

// Listen for messages from background script (Context Menu trigger)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TRIGGER_CONTEXT_TRANSLATE') {
    // Traverse shadow DOM to find the real focused element
    const activeElement = getActiveElement();
    const targetEl = request.source === 'shortcut' ? activeElement : (lastRightClickedElement || activeElement);
    if (!targetEl) return;

    let finalTarget = null;
    const isBodyOrHtml = targetEl.tagName === 'BODY' || targetEl.tagName === 'HTML';
    if (!isBodyOrHtml) {
      finalTarget = findNestedEditable(targetEl);
    } else {
      const isContentEditable = targetEl.getAttribute && (targetEl.getAttribute('contenteditable') === 'true' || targetEl.isContentEditable);
      if (isContentEditable) {
        finalTarget = targetEl;
      }
    }

    if (!finalTarget) return;

    const isInput = finalTarget.tagName === 'INPUT' || finalTarget.tagName === 'TEXTAREA';
    triggerTranslation(finalTarget, isInput);
  }
});

// Trigger translation logic
async function triggerTranslation(element, isInput) {
  let text = '';
  let isSelectionOnly = false;
  let selectionStart = 0;
  let selectionEnd = 0;
  let selRange = null;

  // 1. Get Text to Translate
  if (isInput) {
    try {
      selectionStart = element.selectionStart;
      selectionEnd = element.selectionEnd;
      if (selectionStart !== selectionEnd) {
        text = element.value.substring(selectionStart, selectionEnd);
        isSelectionOnly = true;
      } else {
        text = element.value;
      }
    } catch (e) {
      text = element.value || '';
      isSelectionOnly = false;
    }
  } else {
    // Content editable
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && selection.toString().trim() !== '') {
      text = selection.toString();
      isSelectionOnly = true;
      selRange = selection.getRangeAt(0);
    } else {
      text = element.innerText || element.textContent;
    }
  }

  text = text.trim();
  if (!text) return; // No text to translate

  // 2. Show floating loading indicator
  const loader = showLoader(element);

  // 3. Send message to background script
  chrome.runtime.sendMessage({ type: 'TRANSLATE', text: text }, (response) => {
    if (chrome.runtime.lastError) {
      updateLoaderError(loader, "通信错误，请刷新页面或重载插件");
      return;
    }

    if (response && response.success) {
      const translated = response.translatedText;
      removeLoader(loader);
      
      // 4. Replace with translated text
      replaceText(element, translated, isInput, isSelectionOnly, selectionStart, selectionEnd, selRange);
    } else {
      const errorMsg = response?.error || "翻译失败，请检查 API 配置";
      updateLoaderError(loader, errorMsg);
    }
  });
}

// Show a floating loader next to the element
function showLoader(element) {
  const rect = element.getBoundingClientRect();
  const loader = document.createElement('div');
  loader.className = 'quick-trans-loader-container';
  
  loader.innerHTML = `
    <div class="quick-trans-spinner"></div>
    <span>正在翻译成英文...</span>
  `;
  
  document.body.appendChild(loader);

  // Position it below the input box, aligned right
  const top = rect.top + window.scrollY + rect.height + 6;
  const left = Math.max(10, rect.left + window.scrollX + rect.width - 160); // Ensure it doesn't overflow left boundary
  
  loader.style.top = `${top}px`;
  loader.style.left = `${left}px`;
  
  // Trigger animation frame to show it smoothly
  requestAnimationFrame(() => {
    loader.classList.add('show');
  });

  return loader;
}

// Show error message on the loader, then fade out
function updateLoaderError(loader, msg) {
  loader.innerHTML = `
    <span class="quick-trans-error-icon">⚠️</span>
    <span>${msg}</span>
  `;
  loader.style.borderColor = 'rgba(239, 68, 68, 0.4)';
  
  setTimeout(() => {
    removeLoader(loader);
  }, 4000);
}

// Remove loader smoothly
function removeLoader(loader) {
  loader.classList.remove('show');
  setTimeout(() => {
    if (loader.parentNode) {
      loader.parentNode.removeChild(loader);
    }
  }, 200);
}

// Replace text safely to preserve undo history and trigger React bindings
async function replaceText(element, newText, isInput, isSelectionOnly, selectionStart, selectionEnd, selRange) {
  element.focus();

  if (isInput) {
    if (isSelectionOnly) {
      try {
        element.setSelectionRange(selectionStart, selectionEnd);
      } catch (e) {}
    } else {
      try {
        element.setSelectionRange(0, element.value.length);
      } catch (e) {}
      // Yield to the browser's event loop to allow the selection state to sync
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    
    // Attempt standard edit action to preserve history and trigger frameworks
    let success = false;
    try {
      success = document.execCommand('insertText', false, newText);
    } catch (e) {
      console.warn("execCommand failed:", e);
    }
    
    // Fallback if execCommand fails
    if (!success) {
      const val = element.value;
      let targetValue = newText;
      if (isSelectionOnly) {
        targetValue = val.slice(0, selectionStart) + newText + val.slice(selectionEnd);
      }
      
      // Use native prototype setter to bypass React/Lit/Vue value tracking wrappers
      try {
        const prototype = Object.getPrototypeOf(element);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value') || 
                           Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') ||
                           Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (descriptor && descriptor.set) {
          descriptor.set.call(element, targetValue);
        } else {
          element.value = targetValue;
        }
      } catch (e) {
        element.value = targetValue;
      }
      
      // Manually trigger input events
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else {
    // ContentEditable
    const selection = window.getSelection();
    if (isSelectionOnly && selRange) {
      selection.removeAllRanges();
      selection.addRange(selRange);
    } else {
      // Focus and execute native Select All (exactly like pressing Ctrl+A)
      element.focus();
      document.execCommand('selectAll', false, null);
      
      // Yield to the browser's event loop to allow rich-text editor frameworks
      // (like Lexical, Slate, Draft.js) to sync their internal selection state.
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    let success = false;
    try {
      success = document.execCommand('insertText', false, newText);
    } catch (e) {
      console.warn("execCommand failed on ContentEditable:", e);
    }
    
    // Fallback
    if (!success) {
      if (isSelectionOnly && selRange) {
        selRange.deleteContents();
        selRange.insertNode(document.createTextNode(newText));
      } else {
        element.innerText = newText;
      }
      // Manually trigger input events
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
