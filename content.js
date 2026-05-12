// AskIt Content Script - Page Integration

(function() {
  // Create floating button
  const button = document.createElement('div');
  button.id = 'askit-float-btn';
  button.innerHTML = '🤖';
  button.title = 'AskIt - AI Assistant';

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
      <button class="askit-action" data-action="extract">
        📝 Extract Text
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

  document.body.appendChild(button);
  document.body.appendChild(panel);

  // Button click - toggle panel
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('active');
  });

  // Close button
  document.getElementById('askit-close').addEventListener('click', () => {
    panel.classList.remove('active');
  });

  // Action buttons
  document.querySelectorAll('.askit-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      panel.classList.remove('active');

      switch(action) {
        case 'summarize':
          await summarizePage();
          break;
        case 'extract':
          extractText();
          break;
        case 'translate':
          await translatePage();
          break;
        case 'screenshot':
          await takeScreenshot();
          break;
        case 'chat':
          await chatAboutPage();
          break;
      }
    });
  });

  // Listen for clipboard changes
  let lastClipboard = '';
  document.addEventListener('paste', (e) => {
    // Text pasted - could trigger AskIt
  });

  // Listen for copy events via selectionchange
  document.addEventListener('selectionchange', () => {
    // Selection changed - could show mini tooltip
  });

  // Get page content
  function getPageContent() {
    const clone = document.body.cloneNode(true);
    ['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript'].forEach(tag => {
      clone.querySelectorAll(tag).forEach(el => el.remove());
    });

    let text = clone.innerText || clone.textContent || '';
    text = text.replace(/\s+/g, ' ').trim();
    return text.substring(0, 5000);
  }

  // Summarize page
  async function summarizePage() {
    const content = getPageContent();
    const title = document.title;

    chrome.runtime.sendMessage({
      action: 'pageAction',
      type: 'summarize',
      title: title,
      content: content
    });
  }

  // Extract text
  async function extractText() {
    const selection = window.getSelection();
    let text = selection.toString().trim();

    if (!text) {
      text = getPageContent();
    }

    chrome.runtime.sendMessage({
      action: 'pageAction',
      type: 'extract',
      content: text
    });
  }

  // Translate page
  async function translatePage() {
    const content = getPageContent();
    const title = document.title;

    chrome.runtime.sendMessage({
      action: 'pageAction',
      type: 'translate',
      title: title,
      content: content
    });
  }

  // Take screenshot
  async function takeScreenshot() {
    try {
      // Request screenshot from background script
      chrome.runtime.sendMessage({ action: 'captureScreenshot' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Screenshot failed:', chrome.runtime.lastError);
          alert('Screenshot failed. Please check permissions.');
          return;
        }

        if (response && response.imageData) {
          chrome.runtime.sendMessage({
            action: 'pageAction',
            type: 'screenshot',
            imageData: response.imageData
          });
        } else {
          alert('Screenshot failed. Please check permissions.');
        }
      });
    } catch (error) {
      console.error('Screenshot failed:', error);
      alert('Screenshot failed. Please check permissions.');
    }
  }

  // Chat about page
  async function chatAboutPage() {
    const content = getPageContent();
    const title = document.title;

    chrome.runtime.sendMessage({
      action: 'pageAction',
      type: 'chat',
      title: title,
      content: content
    });
  }

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !button.contains(e.target)) {
      panel.classList.remove('active');
    }
  });
})();
