# AskIt - AI Assistant Chrome Extension

A Chrome extension that brings AI assistance to your browser, powered by your own API endpoint.

## Features

- 🤖 Chat with AI directly from your browser
- 📝 Select text on any page → Right-click → "Ask with AskIt"
- 🌊 Streaming responses for real-time answers
- 💾 Conversation history (session-based)
- ⚙️ Fully customizable API endpoint
- 🎨 Beautiful dark theme
- 📊 Token usage tracking

## Supported API Providers

AskIt works with any OpenAI-compatible API endpoint, including:

- **MiniMax** (default)
- OpenAI
- Azure OpenAI
- Local models (via LM Studio, Ollama, etc.)
- Custom endpoints

## Installation

### From Source

1. Clone this repository:
```bash
git clone https://github.com/axfinn/Askit.git
cd Askit
```

2. Open Chrome and go to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right)

4. Click "Load unpacked"

5. Select the `Askit` folder

### Configure API

1. Click the AskIt icon in your Chrome toolbar

2. Click the ⚙️ settings icon

3. Enter your API configuration:
   - **API Base URL**: Your API endpoint (default: `https://api.minimaxi.com/v1`)
   - **API Key**: Your API key
   - **Model**: Your preferred model

4. Click "Save Settings"

## Usage

### Quick Chat
- Click the AskIt icon in your toolbar
- Type your question
- Press Enter or click Send

### Context Menu
1. Select any text on a webpage
2. Right-click → "Ask with AskIt"
3. Your selected text will appear in the chat

### Keyboard Shortcuts
- `Enter`: Send message
- `Shift + Enter`: New line in message

## For MiniMax Users

If you're using MiniMax API:

1. Get your API key from [MiniMax Platform](https://platform.minimaxi.com)
2. Use these settings:
   - API Base URL: `https://api.minimaxi.com/v1`
   - Model: `MiniMax-M2.7` (or your preferred model)

## API Configuration

AskIt supports models via OpenAI-compatible APIs:

| Setting | Description | Default |
|---------|-------------|---------|
| API Base URL | Your API endpoint | `https://api.minimaxi.com/v1` |
| API Key | Your API key | - |
| Model | Model identifier | `MiniMax-M2.7` |
| Temperature | Creativity level (0-1) | `0.7` |
| Max Tokens | Maximum response length | `2048` |

## Privacy

- Your API key is stored locally in Chrome storage
- No data is sent to any third-party servers (except your configured API endpoint)
- Conversation history is stored locally per session

## License

MIT License
