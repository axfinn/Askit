// AskIt Content Script - Page Integration

(function() {
  // Prevent duplicate initialization
  if (window.__askitInitialized) return;
  window.__askitInitialized = true;

  // Create floating button
  const button = document.createElement('div');
  button.id = 'askit-float-btn';
  button.innerHTML = '🤖';
  button.title = 'AskIt - AI Assistant';
  document.body.appendChild(button);

  // Create popup panel
  const panel = document.createElement('div');
  panel.id = 'askit-panel';
  panel.innerHTML = `
    <div class="askit-panel-header">
      <span>AskIt</span>
      <button id="askit-close">×</button>
    </div>
    <div class="askit-panel-content">
      <button class="askit-action" data-action="summarize">
        📄 Summarize Page
      </button>
      <button class="askit-action" data-action="translate">
        🌐 Translate Page
      </button>
      <button class="askit-action" data-action="screenshot">
        📸 Analyze Screenshot
      </button>
      <div class="askit-divider"></div>
      <button class="askit-action" data-action="chat">
        💬 Chat About Page
      </button>
    </div>
  `;
  document.body.appendChild(panel);

  // Create selection tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'askit-tooltip';
  tooltip.innerHTML = '💬 AskIt';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);

  // State
  let isPanelOpen = false;

  // Button click - toggle panel
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    isPanelOpen = !isPanelOpen;
    panel.classList.toggle('active', isPanelOpen);
    if (isPanelOpen) tooltip.style.display = 'none';
  });

  // Close button
  document.getElementById('askit-close').addEventListener('click', (e) => {
    e.stopPropagation();
    isPanelOpen = false;
    panel.classList.remove('active');
  });

  // Action buttons
  panel.querySelectorAll('.askit-action').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      isPanelOpen = false;
      panel.classList.remove('active');
      tooltip.style.display = 'none';

      // Send action to background
      const message = { action: 'pageAction' };

      switch(action) {
        case 'summarize':
          message.type = 'summarize';
          message.title = document.title;
          message.content = getPageContent();
          break;
        case 'translate':
          message.type = 'translate';
          message.title = document.title;
          message.content = getPageContent();
          break;
        case 'screenshot':
          message.type = 'screenshot';
          break;
        case 'chat':
          message.type = 'chat';
          message.title = document.title;
          message.content = getPageContent();
          break;
      }

      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Send to background failed:', chrome.runtime.lastError);
        }
      });
    });
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (isPanelOpen && !panel.contains(e.target) && !button.contains(e.target)) {
      isPanelOpen = false;
      panel.classList.remove('active');
    }
  });

  // Text selection handler - show tooltip near selection
  document.addEventListener('mouseup', (e) => {
    // Don't show if clicking on our own UI
    if (button.contains(e.target) || panel.contains(e.target) || tooltip.contains(e.target)) {
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 3) {
      // Show tooltip near selection
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      tooltip.style.display = 'block';
      tooltip.style.left = `${rect.left + (rect.width / 2) - 40}px`;
      tooltip.style.top = `${rect.bottom + window.scrollY + 10}px`;
      tooltip.dataset.text = selectedText;
    } else {
      tooltip.style.display = 'none';
    }
  });

  // Tooltip click - send selected text
  tooltip.addEventListener('click', (e) => {
    e.stopPropagation();
    const selectedText = tooltip.dataset.text;
    if (selectedText) {
      tooltip.style.display = 'none';
      chrome.runtime.sendMessage({
        action: 'pageAction',
        type: 'extract',
        content: selectedText
      });
    }
  });

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showTooltip') {
      // Show tooltip at specific position
      tooltip.style.display = 'block';
      tooltip.style.left = request.x + 'px';
      tooltip.style.top = request.y + 'px';
      tooltip.dataset.text = request.text || '';
    }
    sendResponse({ status: 'ok' });
    return true;
  });

  // Get page content (cleaned)
  function getPageContent() {
    const clone = document.body.cloneNode(true);
    ['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript', 'img', 'video', 'audio'].forEach(tag => {
      clone.querySelectorAll(tag).forEach(el => el.remove());
    });

    let text = clone.innerText || clone.textContent || '';
    text = text.replace(/\s+/g, ' ').trim();
    return text.substring(0, 8000);
  }

  // Prevent body scroll when panel is open
  panel.addEventListener('wheel', (e) => {
    e.stopPropagation();
  }, { passive: false });
})();