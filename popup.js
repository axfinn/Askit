// AskIt - AI Assistant Chrome Extension
// Supports MiniMax, DeepSeek, and any OpenAI-compatible API

const PRESETS = {
  minimax: {
    apiBase: 'https://api.minimaxi.com/v1',
    model: 'MiniMax-M2.7'
  },
  deepseek: {
    apiBase: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  }
};

const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const loading = document.getElementById('loading');
const welcome = document.getElementById('welcome');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const saveSettingsBtn = document.getElementById('saveSettings');
const currentModelSpan = document.getElementById('currentModel');
const providerNameSpan = document.getElementById('providerName');
const tempSlider = document.getElementById('temperature');
const tempValue = document.getElementById('tempValue');
const tokenCount = document.getElementById('tokenCount');
const apiProvider = document.getElementById('apiProvider');
const apiBase = document.getElementById('apiBase');
const modelName = document.getElementById('modelName');
const presetMinimax = document.getElementById('presetMinimax');
const presetDeepseek = document.getElementById('presetDeepseek');

// Default settings
let settings = {
  apiProvider: 'minimax',
  apiBase: 'https://api.minimaxi.com/v1',
  apiKey: '',
  model: 'MiniMax-M2.7',
  temperature: 0.7,
  maxTokens: 2048
};

// Load settings from storage
chrome.storage.sync.get(['askit_settings'], (result) => {
  if (result.askit_settings) {
    settings = { ...settings, ...result.askit_settings };
  }
  updateUI();
});

// Update UI with current settings
function updateUI() {
  apiBase.value = settings.apiBase;
  document.getElementById('apiKey').value = settings.apiKey;
  modelName.value = settings.model;
  apiProvider.value = settings.apiProvider;
  tempSlider.value = settings.temperature;
  tempValue.textContent = settings.temperature;
  document.getElementById('maxTokens').value = settings.maxTokens;
  currentModelSpan.textContent = settings.model;
  providerNameSpan.textContent = settings.apiProvider === 'minimax' ? 'MiniMax' : settings.apiProvider === 'deepseek' ? 'DeepSeek' : 'Custom';
  updatePresetButtons();
}

// Update preset button states
function updatePresetButtons() {
  presetMinimax.classList.toggle('active', settings.apiProvider === 'minimax');
  presetDeepseek.classList.toggle('active', settings.apiProvider === 'deepseek');
}

// Toggle settings panel
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

// Preset buttons
presetMinimax.addEventListener('click', () => {
  settings.apiProvider = 'minimax';
  settings.apiBase = PRESETS.minimax.apiBase;
  settings.model = PRESETS.minimax.model;
  apiProvider.value = 'minimax';
  apiBase.value = settings.apiBase;
  modelName.value = settings.model;
  currentModelSpan.textContent = settings.model;
  providerNameSpan.textContent = 'MiniMax';
  updatePresetButtons();
});

presetDeepseek.addEventListener('click', () => {
  settings.apiProvider = 'deepseek';
  settings.apiBase = PRESETS.deepseek.apiBase;
  settings.model = PRESETS.deepseek.model;
  apiProvider.value = 'deepseek';
  apiBase.value = settings.apiBase;
  modelName.value = settings.model;
  currentModelSpan.textContent = settings.model;
  providerNameSpan.textContent = 'DeepSeek';
  updatePresetButtons();
});

// Temperature slider
tempSlider.addEventListener('input', () => {
  tempValue.textContent = tempSlider.value;
});

// Save settings
saveSettingsBtn.addEventListener('click', () => {
  settings.apiProvider = apiProvider.value;
  settings.apiBase = apiBase.value.trim();
  settings.apiKey = document.getElementById('apiKey').value.trim();
  settings.model = modelName.value.trim();
  settings.temperature = parseFloat(tempSlider.value);
  settings.maxTokens = parseInt(document.getElementById('maxTokens').value) || 2048;

  chrome.storage.sync.set({ askit_settings: settings }, () => {
    showToast('Settings saved!');
    settingsPanel.classList.add('hidden');
    currentModelSpan.textContent = settings.model;
    providerNameSpan.textContent = settings.apiProvider === 'minimax' ? 'MiniMax' : settings.apiProvider === 'deepseek' ? 'DeepSeek' : 'Custom';
    updatePresetButtons();
  });
});

// Send message with streaming support
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  if (!settings.apiKey) {
    addMessage('bot', 'Please set your API Key in settings ⚙️');
    return;
  }

  // Show user message
  addMessage('user', text);
  userInput.value = '';
  welcome.style.display = 'none';

  // Show loading
  loading.classList.remove('hidden');
  sendBtn.disabled = true;

  // Create bot message placeholder for streaming
  const botMsg = addMessage('bot', '');
  let fullContent = '';

  try {
    const history = getConversationHistory();
    history.push({ role: 'user', content: text });

    const response = await fetch(`${settings.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant. Keep responses concise and clear. You can use markdown formatting.' },
          ...history
        ],
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let totalTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            const usage = parsed.usage;

            if (content) {
              fullContent += content;
              botMsg.textContent = fullContent;
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }

            if (usage) {
              totalTokens = usage.total_tokens || 0;
              tokenCount.textContent = `${totalTokens} tokens`;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    // Update message with full content
    botMsg.textContent = fullContent || 'No response received.';
    addToHistory('user', text);
    addToHistory('assistant', fullContent);

  } catch (error) {
    botMsg.textContent = `Error: ${error.message}`;
    console.error('API Error:', error);
  } finally {
    loading.classList.add('hidden');
    sendBtn.disabled = false;
  }
}

// Add message to chat
function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = content;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return div;
}

// Conversation history management
let conversationHistory = [];

function addToHistory(role, content) {
  conversationHistory.push({ role, content });
  if (conversationHistory.length > 20) {
    conversationHistory = conversationHistory.slice(-20);
  }
  chrome.storage.session.set({ conversation_history: conversationHistory });
}

function getConversationHistory() {
  return conversationHistory;
}

// Load history from storage
chrome.storage.session.get(['conversation_history'], (result) => {
  if (result.conversation_history) {
    conversationHistory = result.conversation_history;
    if (conversationHistory.length > 0) {
      welcome.style.display = 'none';
      conversationHistory.forEach(msg => {
        addMessage(msg.role, msg.content);
      });
    }
  }
});

// Toast notification
function showToast(text) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showSelection' && request.text) {
    userInput.value = request.text;
    userInput.focus();
  }
  if (request.action === 'clearConversation') {
    conversationHistory = [];
    chrome.storage.session.remove(['conversation_history']);
    messagesContainer.innerHTML = '';
    welcome.style.display = 'block';
  }
});
