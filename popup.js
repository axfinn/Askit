// AskIt - All-in-One AI Chrome Extension
// Supports: Chat, Image Generation, Vision, TTS, Music

// ==================== PRESETS ====================
const PRESETS = {
  minimax: {
    apiBase: 'https://api.minimaxi.com/v1',
    chatModel: 'MiniMax-M2.7',
    vlmModel: 'coding_plan/vlm',
    imageModel: 'image-01',
    ttsModel: 'speech-01',
    musicModel: 'music-01'
  },
  deepseek: {
    apiBase: 'https://api.deepseek.com/v1',
    chatModel: 'deepseek-chat',
    vlmModel: null,
    imageModel: 'deepseek-image',
    ttsModel: null,
    musicModel: null
  },
  openai: {
    apiBase: 'https://api.openai.com/v1',
    chatModel: 'gpt-4o',
    vlmModel: 'gpt-4o',
    imageModel: 'dall-e-3',
    ttsModel: 'tts-1',
    musicModel: null
  }
};

// ==================== STATE ====================
let settings = {
  apiProvider: 'minimax',
  apiBase: 'https://api.minimaxi.com/v1',
  apiKey: '',
  model: 'MiniMax-M2.7',
  temperature: 0.7
};

let conversationHistory = [];

// ==================== DOM ELEMENTS ====================
const messagesContainer = document.getElementById('messages');
const welcome = document.getElementById('welcome');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const tokenCount = document.getElementById('tokenCount');

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  initTabs();
  initPresets();
  initSettings();
  initChat();
  initImageGen();
  initVision();
  initTTS();
  initMusic();
});

// ==================== SETTINGS ====================
function loadSettings() {
  chrome.storage.sync.get(['askit_settings'], (result) => {
    if (result.askit_settings) {
      settings = { ...settings, ...result.askit_settings };
    }
    updateSettingsUI();
  });
}

function updateSettingsUI() {
  document.getElementById('apiBase').value = settings.apiBase;
  document.getElementById('apiKey').value = settings.apiKey;
  document.getElementById('modelName').value = settings.model;
  document.getElementById('apiProvider').value = settings.apiProvider;
  document.getElementById('temperature').value = settings.temperature;
  document.getElementById('tempValue').textContent = settings.temperature;
  document.getElementById('providerLabel').textContent = settings.apiProvider.charAt(0).toUpperCase() + settings.apiProvider.slice(1);
  updatePresetButtons();
}

function initSettings() {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const tempSlider = document.getElementById('temperature');

  settingsBtn.addEventListener('click', () => settingsPanel.classList.toggle('hidden'));
  tempSlider.addEventListener('input', () => document.getElementById('tempValue').textContent = tempSlider.value);

  saveSettingsBtn.addEventListener('click', () => {
    settings.apiProvider = document.getElementById('apiProvider').value;
    settings.apiBase = document.getElementById('apiBase').value.trim();
    settings.apiKey = document.getElementById('apiKey').value.trim();
    settings.model = document.getElementById('modelName').value.trim();
    settings.temperature = parseFloat(tempSlider.value);

    chrome.storage.sync.set({ askit_settings: settings }, () => {
      showToast('Settings saved!');
      settingsPanel.classList.add('hidden');
      document.getElementById('providerLabel').textContent = settings.apiProvider.charAt(0).toUpperCase() + settings.apiProvider.slice(1);
      updatePresetButtons();
    });
  });
}

function initPresets() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const provider = btn.dataset.provider;
      const preset = PRESETS[provider];
      if (!preset) return;

      settings.apiProvider = provider;
      settings.apiBase = preset.apiBase;
      settings.model = preset.chatModel;

      document.getElementById('apiProvider').value = provider;
      document.getElementById('apiBase').value = preset.apiBase;
      document.getElementById('modelName').value = preset.chatModel;
      document.getElementById('providerLabel').textContent = provider.charAt(0).toUpperCase() + provider.slice(1);

      updatePresetButtons();
    });
  });
}

function updatePresetButtons() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.provider === settings.apiProvider);
  });
}

// ==================== TABS ====================
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
    });
  });
}

// ==================== CHAT ====================
function initChat() {
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.querySelector('#chatTab .send');

  sendBtn.addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  chrome.storage.session.get(['conversation_history'], (result) => {
    if (result.conversation_history) {
      conversationHistory = result.conversation_history;
      if (conversationHistory.length > 0) {
        welcome.style.display = 'none';
        conversationHistory.forEach(msg => addMessage(msg.role, msg.content));
      }
    }
  });
}

async function sendChatMessage() {
  const text = document.getElementById('chatInput').value.trim();
  if (!text || !settings.apiKey) {
    if (!settings.apiKey) addMessage('bot', 'Please set your API Key in settings');
    return;
  }

  addMessage('user', text);
  document.getElementById('chatInput').value = '';
  welcome.style.display = 'none';
  showLoading('Thinking...');

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
          { role: 'system', content: 'You are a helpful AI assistant. Keep responses concise and clear.' },
          ...history,
          { role: 'user', content: text }
        ],
        temperature: settings.temperature,
        stream: true
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              botMsg.textContent = fullContent;
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            if (data.usage?.total_tokens) {
              tokenCount.textContent = `${data.usage.total_tokens} tokens`;
            }
          } catch (e) {}
        }
      }
    }

    botMsg.textContent = fullContent || 'No response';
    addToHistory('user', text);
    addToHistory('assistant', fullContent);
  } catch (error) {
    botMsg.textContent = `Error: ${error.message}`;
  } finally {
    hideLoading();
  }
}

// ==================== IMAGE GENERATION ====================
function initImageGen() {
  const btn = document.getElementById('generateImage');
  btn.addEventListener('click', generateImage);
}

async function generateImage() {
  const prompt = document.getElementById('imagePrompt').value.trim();
  const size = document.getElementById('imageSize').value;
  const resultDiv = document.getElementById('imageResult');

  if (!prompt || !settings.apiKey) {
    if (!settings.apiKey) resultDiv.innerHTML = '<p class="error">Please set API Key in settings</p>';
    return;
  }

  showLoading('Generating image...');
  resultDiv.innerHTML = '';

  try {
    const response = await fetch(`${settings.apiBase}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: 'image-01',
        prompt,
        size,
        response_format: 'url'
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (imageUrl) {
      resultDiv.innerHTML = `<img src="${imageUrl}" alt="Generated image"><a href="${imageUrl}" target="_blank" class="btn secondary">Open Image</a>`;
    } else {
      resultDiv.innerHTML = '<p class="error">No image URL in response</p>';
    }
  } catch (error) {
    resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
  } finally {
    hideLoading();
  }
}

// ==================== VISION (Image Understanding) ====================
function initVision() {
  const fileInput = document.getElementById('visionImage');
  const preview = document.getElementById('visionPreview');
  const analyzeBtn = document.getElementById('analyzeImage');

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        preview.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  analyzeBtn.addEventListener('click', analyzeImage);
}

async function analyzeImage() {
  const fileInput = document.getElementById('visionImage');
  const question = document.getElementById('visionQuestion').value.trim() || '请描述这张图片的内容';
  const resultDiv = document.getElementById('visionResult');

  if (!fileInput.files?.[0] || !settings.apiKey) {
    if (!settings.apiKey) resultDiv.innerHTML = '<p class="error">Please set API Key in settings</p>';
    return;
  }

  showLoading('Analyzing image...');
  resultDiv.innerHTML = '';

  try {
    // Convert image to base64
    const base64 = await fileToBase64(fileInput.files[0]);
    const mimeType = fileInput.files[0].type || 'image/jpeg';
    const imageDataUrl = `data:${mimeType};base64,${base64}`;

    if (settings.apiProvider === 'minimax') {
      // Use MiniMax VLM API
      const response = await fetch(`${settings.apiBase}/coding_plan/vlm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          prompt: question,
          image_url: imageDataUrl
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.base_resp?.status_msg || `API error: ${response.status}`);
      }

      const data = await response.json();
      resultDiv.innerHTML = `<div class="text-result">${data.content || 'No description returned'}</div>`;
    } else {
      // Use OpenAI-compatible vision API
      const response = await fetch(`${settings.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: question },
                { type: 'image_url', image_url: { url: imageDataUrl } }
              ]
            }
          ]
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || 'No response';
      resultDiv.innerHTML = `<div class="text-result">${text}</div>`;
    }
  } catch (error) {
    resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
  } finally {
    hideLoading();
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==================== TTS ====================
function initTTS() {
  const speedSlider = document.getElementById('ttsSpeed');
  speedSlider.addEventListener('input', () => {
    document.getElementById('ttsSpeedValue').textContent = speedSlider.value;
  });

  document.getElementById('generateTTS').addEventListener('click', generateTTS);
}

async function generateTTS() {
  const text = document.getElementById('ttsText').value.trim();
  const voice = document.getElementById('ttsVoice').value;
  const speed = parseFloat(document.getElementById('ttsSpeed').value);
  const resultDiv = document.getElementById('ttsResult');

  if (!text || !settings.apiKey) {
    if (!settings.apiKey) resultDiv.innerHTML = '<p class="error">Please set API Key in settings</p>';
    return;
  }

  showLoading('Generating speech...');
  resultDiv.innerHTML = '';

  try {
    const response = await fetch(`${settings.apiBase}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: 'speech-01',
        input: text,
        voice,
        speed
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    resultDiv.innerHTML = `
      <audio controls src="${url}"></audio>
      <a href="${url}" download="speech.mp3" class="btn secondary">Download MP3</a>
    `;
  } catch (error) {
    resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
  } finally {
    hideLoading();
  }
}

// ==================== MUSIC ====================
function initMusic() {
  document.getElementById('generateMusic').addEventListener('click', generateMusic);
}

async function generateMusic() {
  const prompt = document.getElementById('musicPrompt').value.trim();
  const duration = document.getElementById('musicDuration').value;
  const resultDiv = document.getElementById('musicResult');

  if (!prompt || !settings.apiKey) {
    if (!settings.apiKey) resultDiv.innerHTML = '<p class="error">Please set API Key in settings</p>';
    return;
  }

  showLoading('Generating music...');
  resultDiv.innerHTML = '';

  try {
    const response = await fetch(`${settings.apiBase}/audio/music`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: 'music-01',
        prompt,
        duration: parseInt(duration)
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const musicUrl = data.data?.[0]?.url;

    if (musicUrl) {
      resultDiv.innerHTML = `
        <audio controls src="${musicUrl}"></audio>
        <a href="${musicUrl}" target="_blank" class="btn secondary">Open Music</a>
      `;
    } else {
      resultDiv.innerHTML = '<p class="error">No music URL in response</p>';
    }
  } catch (error) {
    resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
  } finally {
    hideLoading();
  }
}

// ==================== UTILITIES ====================
function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = content;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return div;
}

function addToHistory(role, content) {
  conversationHistory.push({ role, content });
  if (conversationHistory.length > 20) conversationHistory = conversationHistory.slice(-20);
  chrome.storage.session.set({ conversation_history: conversationHistory });
}

function getConversationHistory() {
  return conversationHistory.slice(-20);
}

function showLoading(text) {
  loadingText.textContent = text;
  loading.classList.remove('hidden');
}

function hideLoading() {
  loading.classList.add('hidden');
}

function showToast(text) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// Listen for context menu
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showSelection' && request.text) {
    document.getElementById('chatInput').value = request.text;
    document.getElementById('chatInput').focus();
    document.querySelector('[data-tab="chat"]').click();
  }
});
