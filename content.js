// AskIt - MaxAI-like Extension

(function() {
  if (window.__askitInit) return;
  window.__askitInit = true;

  // ========== FLOATING BUTTON ==========
  const fab = document.createElement('div');
  fab.id = 'askit-fab';
  fab.innerHTML = '✦';
  fab.title = 'AskIt (Alt+J)';
  document.body.appendChild(fab);

  // ========== SIDEBAR ==========
  const sidebar = document.createElement('div');
  sidebar.id = 'askit-sidebar';
  sidebar.innerHTML = `
    <div class="askit-sb-header">
      <div class="askit-sb-logo">✦ AskIt</div>
      <button class="askit-sb-close" id="askit-sb-close">×</button>
    </div>
    <div class="askit-sb-tabs">
      <button class="askit-tab-btn active" data-tab="chat">💬 Chat</button>
      <button class="askit-tab-btn" data-tab="tools">🛠️ Tools</button>
    </div>
    <div class="askit-sb-content">
      <div class="askit-tab-content active" data-content="chat">
        <div class="askit-chat-list" id="askit-chat-list">
          <div class="askit-empty">Ask about this page...</div>
        </div>
        <div class="askit-chat-input-wrap">
          <textarea id="askit-chat-input" placeholder="Ask anything about this page..." rows="3"></textarea>
          <button id="askit-chat-send">➤</button>
        </div>
      </div>
      <div class="askit-tab-content" data-content="tools">
        <button class="askit-tool-btn" data-action="summarize">
          <span class="icon">📄</span><span>Summarize Page</span>
        </button>
        <button class="askit-tool-btn" data-action="extract">
          <span class="icon">📝</span><span>Extract Content</span>
        </button>
        <button class="askit-tool-btn" data-action="translate">
          <span class="icon">🌐</span><span>Translate to Chinese</span>
        </button>
        <button class="askit-tool-btn" data-action="screenshot">
          <span class="icon">📸</span><span>Analyze Screenshot</span>
        </button>
      </div>
    </div>
  `;
  sidebar.style.display = 'none';
  document.body.appendChild(sidebar);

  // ========== SELECTION POPUP ==========
  const selPopup = document.createElement('div');
  selPopup.id = 'askit-sel-popup';
  selPopup.innerHTML = `
    <button class="askit-sel-btn" data-action="explain">💡</button>
    <button class="askit-sel-btn" data-action="translate">🌐</button>
    <button class="askit-sel-btn" data-action="summarize">📄</button>
    <button class="askit-sel-btn" data-action="rewrite">✍️</button>
    <button class="askit-sel-btn" data-action="paraphrase">🔄</button>
  `;
  selPopup.style.display = 'none';
  document.body.appendChild(selPopup);

  // ========== STATE ==========
  let sidebarOpen = false;
  let selText = '';

  // ========== SIDEBAR FUNCTIONS ==========
  function openSidebar() {
    sidebarOpen = true;
    sidebar.style.display = 'flex';
    fab.style.display = 'none';
    fab.style.opacity = '0';
  }

  function closeSidebar() {
    sidebarOpen = false;
    sidebar.style.display = 'none';
    fab.style.display = 'flex';
    setTimeout(() => fab.style.opacity = '1', 10);
  }

  function toggleSidebar() {
    sidebarOpen ? closeSidebar() : openSidebar();
  }

  // FAB click
  fab.addEventListener('click', toggleSidebar);

  // Close button
  document.getElementById('askit-sb-close').addEventListener('click', closeSidebar);

  // Tab switching
  sidebar.querySelectorAll('.askit-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sidebar.querySelectorAll('.askit-tab-btn').forEach(b => b.classList.remove('active'));
      sidebar.querySelectorAll('.askit-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      sidebar.querySelector(`[data-content="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  // Tool buttons
  sidebar.querySelectorAll('.askit-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      chrome.runtime.sendMessage({
        action: 'doAction',
        type: action,
        content: getPageContent(),
        title: document.title
      });
      closeSidebar();
    });
  });

  // Chat send
  document.getElementById('askit-chat-send').addEventListener('click', sendChat);
  document.getElementById('askit-chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });

  function sendChat() {
    const input = document.getElementById('askit-chat-input');
    const text = input.value.trim();
    if (!text) return;

    chrome.runtime.sendMessage({
      action: 'doAction',
      type: 'chat',
      content: text,
      title: document.title,
      pageContent: getPageContent()
    });

    // Show user message
    const list = document.getElementById('askit-chat-list');
    list.innerHTML += `<div class="askit-msg askit-msg-user">${escapeHtml(text)}</div>`;
    list.innerHTML += `<div class="askit-msg askit-msg-bot">Analyzing...</div>`;
    input.value = '';
    list.scrollTop = list.scrollHeight;
  }

  // ========== SELECTION POPUP ==========
  document.addEventListener('mouseup', (e) => {
    // Hide if clicking own UI
    if (fab.contains(e.target) || sidebar.contains(e.target) || selPopup.contains(e.target)) return;

    const sel = window.getSelection().toString().trim();
    if (sel.length > 10) {
      selText = sel;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      selPopup.style.left = (rect.left + rect.width / 2 - 100) + 'px';
      selPopup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
      selPopup.style.display = 'flex';
    } else {
      selPopup.style.display = 'none';
    }
  });

  // Selection popup actions
  selPopup.querySelectorAll('.askit-sel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      selPopup.style.display = 'none';

      chrome.runtime.sendMessage({
        action: 'doAction',
        type: action,
        content: selText,
        title: document.title
      });

      // Open sidebar to show result
      setTimeout(() => {
        openSidebar();
        document.querySelector('[data-tab="chat"]').click();
      }, 100);
    });
  });

  // ========== KEYBOARD SHORTCUT ==========
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.altKey) && e.key === 'j') {
      e.preventDefault();
      toggleSidebar();
    }
  });

  // ========== HELPER ==========
  function getPageContent() {
    const clone = document.body.cloneNode(true);
    ['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript', 'img', 'video', 'audio'].forEach(tag => {
      clone.querySelectorAll(tag).forEach(el => el.remove());
    });
    return (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 6000);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== LISTEN FROM BACKGROUND ==========
  chrome.runtime.onMessage.addListener((req, res) => {
    if (req.action === 'showResult') {
      openSidebar();
      document.querySelector('[data-tab="chat"]').click();
      const list = document.getElementById('askit-chat-list');
      list.innerHTML = `<div class="askit-msg askit-msg-bot">${escapeHtml(req.text)}</div>`;
    }
    res({ status: 'ok' });
    return true;
  });
})();