// AskIt - AI Assistant Chrome Extension
// Supports MiniMax API with streaming, function calling, and vision

const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const loading = document.getElementById('loading');
const welcome = document.getElementById('welcome');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const saveSettingsBtn = document.getElementById('saveSettings');
const currentModelSpan = document.getElementById('currentModel');
const tempSlider = document.getElementById('temperature');
const tempValue = document.getElementById('tempValue');
const tokenCount = document.getElementById('tokenCount');

// Default settings - MiniMax Max Plan
let settings = {
  apiBase: 'https://api.minimaxi.com/v1',
  apiKey: '',  // Set your API key in settings
  model: 'MiniMax-M2.7',
  temperature: 0.7,
  maxTokens: 2048
};

// Load settings from storage
chrome.storage.sync.get(['askit_settings'], (result) => {
  if (result.askit_settings) {
    settings = { ...settings, ...result.askit_settings };
  }
  // Update UI
  document.getElementById('apiBase').value = settings.apiBase;
  document.getElementById('apiKey').value = settings.apiKey;
  document.getElementById('modelName').value = settings.model;
  document.getElementById('temperature').value = settings.temperature;
  document.getElementById('maxTokens').value = settings.maxTokens;
  tempValue.textContent = settings.temperature;
  currentModelSpan.textContent = settings.model;
});

// Toggle settings panel
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

// Temperature slider
tempSlider.addEventListener('input', () => {
  tempValue.textContent = tempSlider.value;
});

// Save settings
saveSettingsBtn.addEventListener('click', () => {
  settings.apiBase = document.getElementById('apiBase').value.trim() || 'https://api.minimaxi.com/v1';
  settings.apiKey = document.getElementById('apiKey').value.trim();
  settings.model = document.getElementById('modelName').value;
  settings.temperature = parseFloat(tempSlider.value);
  settings.maxTokens = parseInt(document.getElementById('maxTokens').value) || 2048;

  chrome.storage.sync.set({ askit_settings: settings }, () => {
    showToast('Settings saved!');
    settingsPanel.classList.add('hidden');
    currentModelSpan.textContent = settings.model;
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
          { role: 'system', content: 'You are a helpful AI assistant. Keep responses concise and clear. You can use markdown formatting in your responses.' },
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
  // Keep last 20 messages
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
    // Display history on load
    if (conversationHistory.length > 0) {
      welcome.style.display = 'none';
      conversationHistory.forEach(msg => {
        addMessage(msg.role, msg.content);
      });
    }
  }
});

// Simple toast notification
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
