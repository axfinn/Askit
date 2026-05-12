# AskIt - All-in-One AI Chrome Extension

A powerful Chrome extension that brings AI capabilities to your browser, powered by your own API endpoint.

## Features

### 💬 Chat
- Real-time streaming responses
- Conversation history
- Markdown support
- Multiple AI providers

### 🖼️ Image Generation
- Text-to-image generation
- Multiple aspect ratios
- Multiple model support

### 👁️ Vision
- Upload images for analysis
- Ask questions about images
- Supports base64 encoded images

### 🎤 Text to Speech
- Multiple voice options
- Adjustable speed
- MP3 download

### 🎵 Music Generation
- Text-to-music
- Duration selection
- Multiple styles

## Supported Providers

| Provider | Chat | Image | Vision | TTS | Music |
|----------|------|-------|--------|-----|-------|
| MiniMax | ✅ | ✅ | ✅ | ✅ | ✅ |
| DeepSeek | ✅ | ✅ | ✅ | - | - |
| OpenAI | ✅ | ✅ | ✅ | ✅ | - |

## Installation

1. Clone this repository:
```bash
git clone https://github.com/axfinn/Askit.git
```

2. Open Chrome → `chrome://extensions/`

3. Enable "Developer mode" (top right)

4. Click "Load unpacked" → Select `Askit` folder

## Configuration

### Quick Setup

1. Click ⚙️ settings icon
2. Choose a preset:
   - **MiniMax** - Recommended (Image-01, TTS, Music included)
   - **DeepSeek** - Good for chat
   - **OpenAI** - GPT-4, DALL-E, TTS

3. Enter your API Key

4. Click "Save Settings"

### Manual Configuration

| Setting | Description |
|---------|-------------|
| API Base URL | API endpoint (default varies by provider) |
| API Key | Your API key |
| Model | Chat model identifier |

## API Keys

### MiniMax (Recommended)
- Get key at: https://platform.minimaxi.com
- Supports: Chat, Image-01, TTS, Music

### DeepSeek
- Get key at: https://platform.deepseek.com
- Supports: Chat, Image

### OpenAI
- Get key at: https://platform.openai.com
- Supports: GPT-4, DALL-E, TTS

## Usage

### Chat
1. Click AskIt icon in toolbar
2. Select **💬 Chat** tab
3. Type your question
4. Press Enter or click ➤

### Generate Image
1. Select **🖼️ Image** tab
2. Enter your prompt
3. Choose size and model
4. Click "Generate Image"

### Analyze Image
1. Select **👁️ Vision** tab
2. Upload an image
3. Enter your question
4. Click "Analyze Image"

### Text to Speech
1. Select **🎤 TTS** tab
2. Enter text
3. Choose voice and speed
4. Click "Generate Speech"

### Generate Music
1. Select **🎵 Music** tab
2. Enter music description
3. Choose duration
4. Click "Generate Music"

## Privacy

- API keys stored locally in Chrome storage
- No third-party data sharing
- All API calls go directly to your configured provider

## License

MIT License
