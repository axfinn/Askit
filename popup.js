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

  // Check for pending page actions from content script
  checkPendingPageAction();
});

function checkPendingPageAction() {
  chrome.runtime.sendMessage({ action: 'getPendingPageAction' }, (pendingAction) => {
    if (pendingAction && pendingAction.action === 'pageAction') {
      handlePageAction(pendingAction);
    }
  });
}

// ==================== HISTORY MANAGEMENT ====================
function loadHistory() {
  chrome.storage.local.get(['conversation_history'], (result) => {
    if (result.conversation_history) {
      conversationHistory = result.conversation_history;
      if (conversationHistory.length > 0) {
        welcome.style.display = 'none';
        conversationHistory.forEach(msg => addMessage(msg.role, msg.content));
      }
    }
  });
}

function saveHistory() {
  chrome.storage.local.set({ conversation_history: conversationHistory });
}

function clearHistory() {
  if (confirm('Delete all chat history?')) {
    conversationHistory = [];
    chrome.storage.local.remove(['conversation_history']);
    messagesContainer.innerHTML = '';
    welcome.style.display = 'block';
    showToast('History deleted');
  }
}

// ==================== MUSIC HISTORY ====================
let musicHistory = [];

function loadMusicHistory() {
  chrome.storage.local.get(['music_history'], (result) => {
    if (result.music_history) {
      musicHistory = result.music_history;
      renderMusicHistory();
    }
  });
}

function saveMusicToHistory(url, title) {
  const item = {
    id: Date.now(),
    url: url,
    title: title.substring(0, 50),
    time: new Date().toLocaleTimeString()
  };
  musicHistory.unshift(item);
  if (musicHistory.length > 10) musicHistory = musicHistory.slice(0, 10);
  chrome.storage.local.set({ music_history: musicHistory });
  renderMusicHistory();
}

function renderMusicHistory() {
  const historyDiv = document.getElementById('musicHistory');
  const listDiv = document.getElementById('musicHistoryList');

  if (musicHistory.length === 0) {
    historyDiv.classList.add('hidden');
    return;
  }

  historyDiv.classList.remove('hidden');
  listDiv.innerHTML = musicHistory.map(item => `
    <div class="music-history-item" data-id="${item.id}">
      <audio controls src="${item.url}"></audio>
      <div class="music-info">${item.title} • ${item.time}</div>
    </div>
  `).join('');
}

function clearMusicHistory() {
  if (confirm('Delete all music history?')) {
    musicHistory = [];
    chrome.storage.local.remove(['music_history']);
    renderMusicHistory();
    showToast('Music history deleted');
  }
}

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
  const clearBtn = document.getElementById('clearHistory');

  sendBtn.addEventListener('click', sendChatMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  clearBtn.addEventListener('click', clearHistory);

  // Load persistent chat history
  loadHistory();
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

// ==================== MUSIC + LYRICS ====================
function initMusic() {
  document.getElementById('generateLyrics').addEventListener('click', generateLyrics);
  document.getElementById('generateMusicWithLyrics').addEventListener('click', generateMusicWithLyrics);
  document.getElementById('clearMusicHistory').addEventListener('click', clearMusicHistory);
  loadMusicHistory();
}

// Generate lyrics from theme
async function generateLyrics() {
  const theme = document.getElementById('musicTheme').value.trim();
  const lyricsResult = document.getElementById('lyricsResult');
  const lyricsText = document.getElementById('lyricsText');

  if (!theme || !settings.apiKey) {
    if (!settings.apiKey) alert('Please set API Key in settings');
    return;
  }

  showLoading('Generating lyrics...');

  try {
    const response = await fetch(`${settings.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: 'You are a creative songwriter. Write original song lyrics based on the theme. Include verse, chorus structure. Write in Chinese unless theme is in English.' },
          { role: 'user', content: `Write song lyrics about: ${theme}` }
        ],
        temperature: 0.8,
        max_tokens: 800
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const lyrics = data.choices?.[0]?.message?.content || '';

    lyricsText.value = lyrics;
    lyricsResult.classList.remove('hidden');
    showToast('Lyrics generated!');
  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    hideLoading();
  }
}

// Generate music with lyrics
async function generateMusicWithLyrics() {
  const theme = document.getElementById('musicTheme').value.trim();
  const style = document.getElementById('musicStyle').value.trim();
  const lyrics = document.getElementById('lyricsText').value.trim();
  const duration = document.getElementById('musicDuration').value;
  const resultDiv = document.getElementById('musicResult');

  if (!settings.apiKey) {
    resultDiv.innerHTML = '<p class="error">Please set API Key in settings</p>';
    return;
  }

  // Build prompt from lyrics
  let musicPrompt = '';
  if (lyrics) {
    musicPrompt = `${style ? style + '. ' : ''}Lyrics: ${lyrics.substring(0, 500)}`;
  } else if (theme) {
    musicPrompt = `${style ? style + '. ' : ''}Theme: ${theme}`;
  } else {
    resultDiv.innerHTML = '<p class="error">Please enter a theme or generate lyrics first</p>';
    return;
  }

  showLoading('Generating music...');
  resultDiv.innerHTML = '';

  try {
    const response = await fetch(`${settings.apiBase}/music_generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: 'music-2.6',
        prompt: musicPrompt,
        lyrics: lyrics || undefined,
        audio_setting: {
          format: 'mp3'
        }
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const musicUrl = data.data?.audio;

    if (musicUrl) {
      resultDiv.innerHTML = `
        <audio controls src="${musicUrl}"></audio>
        <a href="${musicUrl}" target="_blank" class="btn secondary">Open Music</a>
      `;
      // Save to history
      saveMusicToHistory(musicUrl, theme || 'Generated Music');
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
  if (conversationHistory.length > 50) conversationHistory = conversationHistory.slice(-50);
  saveHistory();
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

// Listen for actions from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showSelection' && request.text) {
    document.getElementById('chatInput').value = request.text;
    document.getElementById('chatInput').focus();
    document.querySelector('[data-tab="chat"]').click();
  }

  if (request.action === 'notifyAction' || request.action === 'doAction') {
    handleAction(request);
  }
});

// Handle actions from content script
async function handleAction(request) {
  const { type, content, title, pageContent, imageData } = request;

  // Switch to chat tab
  document.querySelector('[data-tab="chat"]').click();

  switch(type) {
    case 'summarize':
      await summarizePageContent(title || 'Page', pageContent || content);
      break;
    case 'translate':
      await translatePageContent(title || 'Page', pageContent || content);
      break;
    case 'chat':
      if (content && !pageContent) {
        addMessage('user', content);
        showToast('Ask anything...');
      } else {
        await chatAboutPageContent(title || 'Page', pageContent || content);
      }
      break;
    case 'explain':
      addMessage('user', `💡 Explain: ${content}`);
      showToast('Explaining...');
      break;
    case 'extract':
      addMessage('user', content);
      showToast('Text extracted!');
      break;
    case 'screenshot':
      await analyzeScreenshot(imageData);
      break;
    case 'rewrite':
    case 'paraphrase':
      addMessage('user', `🔄 ${type}: ${content}`);
      showToast('Processing...');
      break;
  }
}

// Analyze screenshot
async function analyzeScreenshot(imageData) {
  if (!settings.apiKey) {
    addMessage('bot', 'Please set your API Key in settings');
    return;
  }

  if (!imageData) {
    addMessage('bot', 'Screenshot capture failed');
    return;
  }

  welcome.style.display = 'none';
  showLoading('Analyzing screenshot...');

  const botMsg = addMessage('user', '📸 Analyze this screenshot');
  const botMsg2 = addMessage('bot', '');

  try {
    if (settings.apiProvider === 'minimax') {
      // Use MiniMax VLM API
      const response = await fetch(`${settings.apiBase}/coding_plan/vlm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          prompt: '请详细描述这张截图的内容，包括所有文字、界面元素和操作。',
          image_url: imageData
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.base_resp?.status_msg || `API error: ${response.status}`);
      }

      const data = await response.json();
      botMsg2.textContent = data.content || 'No description returned';
    } else {
      // Use OpenAI-compatible vision API
      const base64Data = imageData.split(',')[1];

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
                { type: 'text', text: 'Please describe this screenshot in detail, including any text, UI elements, and actions.' },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Data}` } }
              ]
            }
          ],
          max_tokens: 1000
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      botMsg2.textContent = data.choices?.[0]?.message?.content || 'No response';
    }
  } catch (error) {
    botMsg2.textContent = `Error: ${error.message}`;
  } finally {
    hideLoading();
  }
}

// Summarize page content
async function summarizePageContent(title, content) {
  if (!settings.apiKey) {
    addMessage('bot', 'Please set your API Key in settings');
    return;
  }

  welcome.style.display = 'none';
  showLoading('Summarizing page...');

  const prompt = `Please summarize the following content from "${title}" in a concise way:\n\n${content}`;

  const botMsg = addMessage('user', `📄 Summarize: ${title}`);
  const botMsg2 = addMessage('bot', '');

  try {
    const response = await fetch(`${settings.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that summarizes content concisely. Keep summaries to 3-5 key points.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 500
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || 'Failed to summarize';

    botMsg2.textContent = summary;
  } catch (error) {
    botMsg2.textContent = `Error: ${error.message}`;
  } finally {
    hideLoading();
  }
}

// Translate page content
async function translatePageContent(title, content) {
  if (!settings.apiKey) {
    addMessage('bot', 'Please set your API Key in settings');
    return;
  }

  welcome.style.display = 'none';
  showLoading('Translating page...');

  const prompt = `Translate the following content from "${title}" to Chinese:\n\n${content}`;

  const botMsg = addMessage('user', `🌐 Translate: ${title}`);
  const botMsg2 = addMessage('bot', '');

  try {
    const response = await fetch(`${settings.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: 'You are a helpful translator. Translate the content to Chinese naturally.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 2000
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content || 'Failed to translate';

    botMsg2.textContent = translation;
  } catch (error) {
    botMsg2.textContent = `Error: ${error.message}`;
  } finally {
    hideLoading();
  }
}

// Chat about page content
async function chatAboutPageContent(title, content) {
  if (!settings.apiKey) {
    addMessage('bot', 'Please set your API Key in settings');
    return;
  }

  welcome.style.display = 'none';
  showLoading('Analyzing page...');

  const prompt = `Here's the content from "${title}":\n\n${content.substring(0, 3000)}\n\nWhat is this page about? Answer briefly.`;

  const botMsg = addMessage('user', `💬 About this page: ${title}`);
  const botMsg2 = addMessage('bot', '');

  try {
    const response = await fetch(`${settings.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Analyze the page content and give a brief summary.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'No response';

    botMsg2.textContent = answer;
  } catch (error) {
    botMsg2.textContent = `Error: ${error.message}`;
  } finally {
    hideLoading();
  }
}
