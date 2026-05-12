// AskIt Content Script - Right Side Drawer

(function() {
  // Prevent duplicate initialization
  if (window.__askitInitialized) return;
  window.__askitInitialized = true;

  // Create floating button (bottom right corner)
  const button = document.createElement('div');
  button.id = 'askit-float-btn';
  button.innerHTML = '🤖';
  button.title = 'AskIt - AI Assistant';
  document.body.appendChild(button);

  // Create right-side drawer panel
  const drawer = document.createElement('div');
  drawer.id = 'askit-drawer';
  drawer.innerHTML = `
    <div class="askit-drawer-header">
      <div class="askit-drawer-title">
        <span>🤖</span>
        <span>AskIt</span>
      </div>
      <button id="askit-drawer-close" class="askit-close-btn">×</button>
    </div>
    <div class="askit-drawer-tabs">
      <button class="askit-drawer-tab active" data-tab="quick">⚡ Quick</button>
      <button class="askit-drawer-tab" data-tab="chat">💬 Chat</button>
      <button class="askit-drawer-tab" data-tab="tools">🛠️ Tools</button>
    </div>
    <div class="askit-drawer-content">
      <!-- Quick Tab: Smart suggestions based on context -->
      <div class="askit-tab-panel active" data-panel="quick">
        <div class="askit-context-hint" id="askitContextHint">
          Select text on page for smart actions
        </div>
        <div class="askit-quick-actions" id="askitQuickActions">
          <button class="askit-action-btn" data-action="summarize">
            <span class="icon">📄</span>
            <span class="label">Summarize Page</span>
          </button>
          <button class="askit-action-btn" data-action="translate">
            <span class="icon">🌐</span>
            <span class="label">Translate</span>
          </button>
          <button class="askit-action-btn" data-action="screenshot">
            <span class="icon">📸</span>
            <span class="label">Screenshot</span>
          </button>
          <button class="askit-action-btn" data-action="explain">
            <span class="icon">💡</span>
            <span class="label">Explain</span>
          </button>
        </div>
        <div class="askit-selection-preview" id="askitSelectionPreview" style="display:none;">
          <div class="askit-selection-label">Selected:</div>
          <div class="askit-selection-text" id="askitSelectionText"></div>
        </div>
      </div>
      <!-- Chat Tab: Direct chat with AI -->
      <div class="askit-tab-panel" data-panel="chat">
        <div class="askit-chat-messages" id="askitChatMessages">
          <div class="askit-welcome-msg">Ask anything about this page</div>
        </div>
        <div class="askit-chat-input-area">
          <textarea id="askitChatInput" placeholder="Ask about this page..." rows="2"></textarea>
          <button id="askitChatSend">➤</button>
        </div>
      </div>
      <!-- Tools Tab: Page actions -->
      <div class="askit-tab-panel" data-panel="tools">
        <div class="askit-tool-item">
          <label>Page Title</label>
          <div class="askit-tool-value" id="askitPageTitle">Loading...</div>
        </div>
        <div class="askit-tool-item">
          <label>Page Summary</label>
          <button class="askit-tool-btn" data-action="summarize">📄 Generate Summary</button>
        </div>
        <div class="askit-tool-item">
          <label>Extract Content</label>
          <button class="askit-tool-btn" data-action="extract">📝 Extract Text</button>
        </div>
        <div class="askit-tool-item">
          <label>Translate Page</label>
          <select id="askitTranslateLang">
            <option value="zh">中文</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
          </select>
          <button class="askit-tool-btn" data-action="translate">🌐 Translate</button>
        </div>
      </div>
    </div>
    <div class="askit-drawer-footer">
      <div class="askit-credits">Powered by AskIt</div>
    </div>
  `;
  document.body.appendChild(drawer);

  // Create selection tooltip with smart suggestions
  const tooltip = document.createElement('div');
  tooltip.id = 'askit-tooltip';
  tooltip.innerHTML = `
    <div class="askit-tooltip-main">
      <span class="askit-tooltip-icon">💬</span>
      <span class="askit-tooltip-text">AskIt</span>
    </div>
    <div class="askit-tooltip-actions">
      <button class="askit-quick-btn" data-action="explain">💡 Explain</button>
      <button class="askit-quick-btn" data-action="translate">🌐 Translate</button>
      <button class="askit-quick-btn" data-action="summarize">📄 Summarize</button>
      <button class="askit-quick-btn" data-action="search">🔍 Search</button>
    </div>
  `;
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);

  // State
  let isDrawerOpen = false;
  let selectedText = '';
  let currentTab = 'quick';

  // ============ DRAWER FUNCTIONS ============

  // Toggle drawer
  function toggleDrawer() {
    isDrawerOpen = !isDrawerOpen;
    drawer.classList.toggle('active', isDrawerOpen);
    button.classList.toggle('drawer-open', isDrawerOpen);

    if (isDrawerOpen) {
      // Update page title in tools tab
      document.getElementById('askitPageTitle').textContent = document.title.substring(0, 50);
    }
  }

  // Close drawer
  function closeDrawer() {
    isDrawerOpen = false;
    drawer.classList.remove('active');
    button.classList.remove('active');
  }

  // Tab switching
  function switchTab(tabName) {
    currentTab = tabName;
    drawer.querySelectorAll('.askit-drawer-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    drawer.querySelectorAll('.askit-tab-panel').forEach(p => {
      p.classList.toggle('active', p.dataset.panel === tabName);
    });
  }

  // Send message to background
  function sendToBackground(message) {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Background send failed:', chrome.runtime.lastError);
      }
    });
  }

  // Show action result in chat
  function showActionResult(text, type) {
    switchTab('chat');
    const messagesDiv = document.getElementById('askitChatMessages');
    messagesDiv.innerHTML = '';

    const msg = document.createElement('div');
    msg.className = `askit-msg askit-msg-${type}`;
    msg.textContent = text;
    messagesDiv.appendChild(msg);
  }

  // ============ EVENT LISTENERS ============

  // Floating button click
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDrawer();
  });

  // Drawer close button
  document.getElementById('askit-drawer-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeDrawer();
  });

  // Tab switching
  drawer.querySelectorAll('.askit-drawer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Quick actions in drawer
  drawer.querySelectorAll('.askit-action-btn, .askit-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleDrawerAction(action);
    });
  });

  // Chat send button
  document.getElementById('askitChatSend').addEventListener('click', () => {
    const input = document.getElementById('askitChatInput');
    const text = input.value.trim();
    if (text) {
      sendToBackground({
        action: 'pageAction',
        type: 'chatInput',
        content: text,
        pageTitle: document.title,
        pageContent: getPageContent()
      });
      input.value = '';
    }
  });

  // Chat input enter key
  document.getElementById('askitChatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('askitChatSend').click();
    }
  });

  // Handle drawer actions
  function handleDrawerAction(action) {
    const content = getPageContent();

    switch(action) {
      case 'summarize':
        sendToBackground({ action: 'pageAction', type: 'summarize', title: document.title, content: content });
        showActionResult('Summarizing page...', 'bot');
        break;
      case 'translate':
        const lang = document.getElementById('askitTranslateLang')?.value || 'zh';
        sendToBackground({ action: 'pageAction', type: 'translate', title: document.title, content: content, targetLang: lang });
        showActionResult('Translating page...', 'bot');
        break;
      case 'screenshot':
        sendToBackground({ action: 'pageAction', type: 'screenshot' });
        showActionResult('Capturing screenshot...', 'bot');
        break;
      case 'explain':
        if (selectedText) {
          sendToBackground({ action: 'pageAction', type: 'explain', content: selectedText });
          showActionResult('Explaining: ' + selectedText.substring(0, 50) + '...', 'bot');
        }
        break;
      case 'extract':
        sendToBackground({ action: 'pageAction', type: 'extract', content: content });
        showActionResult('Extracting content...', 'bot');
        break;
    }
    closeDrawer();
  }

  // ============ SELECTION TOOLTIP ============

  document.addEventListener('mouseup', (e) => {
    // Don't show if clicking on our own UI
    if (button.contains(e.target) || drawer.contains(e.target) || tooltip.contains(e.target)) {
      return;
    }

    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 15) {
      selectedText = text;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      tooltip.style.display = 'block';
      tooltip.style.left = `${rect.left + (rect.width / 2) - 80}px`;
      tooltip.style.top = `${rect.bottom + window.scrollY + 10}px`;

      // Update context hint in drawer if open
      const hint = document.getElementById('askitContextHint');
      if (hint) hint.textContent = `Selected: ${text.substring(0, 30)}...`;

      const preview = document.getElementById('askitSelectionPreview');
      const previewText = document.getElementById('askitSelectionText');
      if (preview && previewText) {
        preview.style.display = 'block';
        previewText.textContent = text.substring(0, 100) + (text.length > 100 ? '...' : '');
      }
    } else {
      tooltip.style.display = 'none';
    }
  });

  // Tooltip quick action buttons
  tooltip.querySelectorAll('.askit-quick-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      tooltip.style.display = 'none';

      if (!selectedText) return;

      let message = { action: 'pageAction', type: 'extract', content: selectedText };

      switch(action) {
        case 'explain':
          message.type = 'explain';
          message.content = selectedText;
          break;
        case 'translate':
          message.type = 'translateSelection';
          message.content = selectedText;
          break;
        case 'summarize':
          message.type = 'summarizeSelection';
          message.content = selectedText;
          break;
        case 'search':
          message.type = 'searchSelection';
          message.content = selectedText;
          break;
      }

      sendToBackground(message);
      selectedText = '';
    });
  });

  // Tooltip click - send to chat
  tooltip.querySelector('.askit-tooltip-main').addEventListener('click', (e) => {
    e.stopPropagation();
    if (selectedText) {
      tooltip.style.display = 'none';
      sendToBackground({
        action: 'pageAction',
        type: 'extract',
        content: selectedText
      });
      // Open drawer to show result
      if (!isDrawerOpen) toggleDrawer();
      switchTab('chat');
    }
  });

  // ============ PAGE CONTENT ============

  function getPageContent() {
    const clone = document.body.cloneNode(true);
    ['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript', 'img', 'video', 'audio', 'noscript'].forEach(tag => {
      clone.querySelectorAll(tag).forEach(el => el.remove());
    });

    let text = clone.innerText || clone.textContent || '';
    text = text.replace(/\s+/g, ' ').trim();
    return text.substring(0, 8000);
  }

  // ============ LISTEN FOR BACKGROUND MESSAGES ============

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showDrawer') {
      if (!isDrawerOpen) toggleDrawer();
      if (request.tab) switchTab(request.tab);
    }
    if (request.action === 'showResult') {
      if (!isDrawerOpen) toggleDrawer();
      switchTab('chat');
      const messagesDiv = document.getElementById('askitChatMessages');
      messagesDiv.innerHTML = '';
      const msg = document.createElement('div');
      msg.className = 'askit-msg askit-msg-bot';
      msg.textContent = request.text;
      messagesDiv.appendChild(msg);
    }
    sendResponse({ status: 'ok' });
    return true;
  });

  // Close drawer when clicking outside (optional - drawer now stays open)
  // document.addEventListener('click', (e) => {
  //   if (isDrawerOpen && !drawer.contains(e.target) && !button.contains(e.target)) {
  //     closeDrawer();
  //   }
  // });

  // Drawer stays open - user controls it manually
})();