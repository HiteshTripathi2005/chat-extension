# Zenix - Gemini Powered

An intelligent Chrome extension that transforms any webpage into an interactive AI assistant using Google's Gemini 2.0 Flash model. Ask questions, get summaries, analyze content, and more - all while browsing.

## 🚀 Features

### Core AI Capabilities
- **Context-Aware Chat**: Ask questions about the current webpage content
- **🎯 Element Selection**: Select specific DOM elements for focused AI analysis (NEW!)
- **Smart Summarization**: Get concise summaries of articles, documents, and long pages
- **Content Analysis**: Sentiment analysis, topic extraction, and readability scoring
- **Question Answering**: Natural language queries about webpage information
- **Multi-Language Support**: Automatic translation and multilingual responses

### Advanced Features
- **Real-time Responses**: Powered by Gemini 2.0 Flash for fast, accurate answers
- **Conversation Memory**: Maintains context across multiple interactions
- **Selective Context**: Choose specific page elements to analyze (reduces token usage!)
- **Action Suggestions**: Smart recommendations based on page content
- **Privacy-First**: Content processed securely with user consent

## 📋 Prerequisites

- Google Chrome browser (latest version)
- Google AI API key (free tier available)
- Basic understanding of Chrome extension installation

## 🛠 Installation & Setup

### Step 1: Install Dependencies
```bash
# Clone the repository
git clone https://github.com/HiteshTripathi2005/chat-extension.git
cd chat-extension

# Install all dependencies (client + server)
npm run install:all
# or install individually:
# npm run install:client
# npm run install:server
```

### Step 2: Start the Express Server
The extension now uses an Express backend for AI processing.

**Terminal 1:**
```bash
# Start the server (required for the extension to work)
bun run server:dev
```

The server will run on `http://localhost:3000`. Keep this terminal running.

📖 [Full Server Documentation](server/README.md)

### Step 3: Build and Load Extension

**Terminal 2:**
```bash
# Build the extension
bun run dev    # Auto-rebuild on changes (recommended)
# or
bun run build  # One-time build
```

Then:
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the **`client/`** folder
4. The extension should appear in your extensions list

📖 [Full Client Documentation](client/README.md)

### Step 4: Get Google AI API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key (keep it secure!)

### Step 5: Configure API Key
1. Click the extension icon in Chrome toolbar
2. Open the side panel
3. Click the settings gear icon (⚙️)
4. Enter your Google AI API key
5. Click "Save" - the key is stored securely in Chrome

## 💡 Usage Guide

### Basic Chat
1. Navigate to any webpage
2. Click the extension icon to open the side panel
3. Type your question or request in the input field
4. Press Enter or click Send

### 🎯 Element Selection (NEW!)
1. Click the crosshairs icon (🎯) in the side panel header
2. Hover over elements on the page (they'll highlight in blue)
3. Click on the element you want to analyze
4. Ask questions - the AI will focus only on that element!
5. Click the ✕ on the purple banner to clear selection

**Benefits**: Reduces token usage, improves accuracy, and provides focused responses!

📖 [Full Element Selection Guide](ELEMENT_SELECTION_GUIDE.md)

### Example Queries
- "Summarize this article"
- "What are the main points discussed here?"
- "Translate this page to Spanish"
- "What is the sentiment of this review?"
- "Extract the contact information"
- "Explain this technical concept"

### 🎯 Element-Specific Queries
- Select a code block → "Explain this code"
- Select an article → "What's the main argument?"
- Select a product description → "List the key features"
- Select a comment section → "What's the general sentiment?"
- Select a form → "What information is required?"

### Advanced Features
- **Page Analysis**: "Analyze the tone of this article"
- **Content Extraction**: "Find all email addresses on this page"
- **Research Help**: "What are the key takeaways from this research paper?"

## 🏗 Development Roadmap

### Phase 1: Foundation (Current)
- ✅ Basic extension structure
- ✅ Side panel UI
- ✅ Google AI API integration
- ✅ Secure API key management
- ✅ Basic chat functionality

### Phase 2: Enhanced Features
- ✅ Webpage content extraction
- ✅ Conversation memory
- ✅ Typing indicators and better UX
- ✅ Error handling and retry logic
- ✅ Element selection for focused context (NEW!)

### Phase 3: Advanced Capabilities
- ✅ Response streaming for real-time feel
- 🔄 Custom prompt templates
- 🔄 Multi-modal content support
- 🔄 Usage analytics and insights
- 🔄 Multi-element selection

### Phase 4: Production Ready
- 🔄 Comprehensive testing
- 🔄 Performance optimization
- 🔄 Chrome Web Store publishing
- 🔄 User feedback integration

## 📁 Project Structure

```
├── client/                   # Chrome Extension
│   ├── package.json         # Client dependencies and build scripts
│   ├── manifest.json        # Extension configuration and permissions
│   ├── webpack.config.cjs   # Build configuration
│   ├── logo.png            # Extension icon
│   ├── README.md           # Client documentation
│   ├── src/                # Extension source code
│   │   ├── background.js   # Service worker for coordination
│   │   ├── content.js      # Content script for DOM element selection
│   │   ├── sidepanel.html  # Main UI layout and styling
│   │   ├── sidepanel.js    # Chat logic and user interactions
│   │   ├── index.css       # Styles for the side panel
│   │   ├── utils/
│   │   │   └── prompt.js   # AI prompt construction
│   │   └── tools/
│   │       └── time-tool.js  # Time utility tool
│   └── dist/               # Built files (generated by webpack)
│
├── server/                  # Express Backend
│   ├── package.json         # Server dependencies and scripts
│   ├── index.js            # Express server entry point
│   ├── README.md           # Server documentation
│   └── src/
│       ├── config.js       # Server configuration
│       ├── routes/
│       │   └── ai.js      # AI endpoints
│       └── controllers/
│           └── aiController.js  # AI processing logic
│
├── package.json            # Root scripts for managing client/server
├── nodemon.json           # Nodemon configuration
├── .env.example           # Environment template
├── PROJECT_STRUCTURE.md   # Detailed structure documentation
├── SERVER.md              # Server documentation
├── QUICKSTART.md          # Quick start guide
├── MIGRATION.md           # Migration notes
└── CHECKLIST.md           # Development checklist
```

## 🔧 Technical Details

### Architecture
- **Frontend**: HTML/CSS/JavaScript side panel
- **Backend**: Express.js server for AI processing
- **Extension**: Chrome extension service worker for coordination
- **AI Engine**: Google Gemini 2.0 Flash via Vercel AI SDK
- **Storage**: Chrome secure storage for API keys
- **Content Access**: Chrome scripting API for webpage content
- **Communication**: HTTP with Server-Sent Events (SSE) for streaming

### System Flow
1. **User Input** → Side panel captures message
2. **Content Extraction** → Background script extracts webpage content
3. **HTTP Request** → Background sends data to Express server
4. **AI Processing** → Server calls Google Gemini API
5. **SSE Streaming** → Server streams response back
6. **Real-time Display** → Side panel shows response as it arrives

### Permissions Required
- `sidePanel`: For the chat interface
- `activeTab`: To access current webpage content
- `scripting`: To extract webpage data safely
- `storage`: To save API keys securely

### API Integration
- Uses Google AI JavaScript SDK
- Implements proper error handling and rate limiting
- Secure API key storage with user encryption
- Content processed with privacy considerations

## 🐛 Troubleshooting

### Common Issues

**"API Key Invalid" Error**
- Verify your API key in Google AI Studio
- Check for extra spaces or characters
- Regenerate key if compromised

**"No Content Found" Message**
- Ensure you're on a webpage with text content
- Check if the page has loaded completely
- Some dynamic content may not be accessible

**Extension Not Loading**
- Reload the extension in `chrome://extensions/`
- Check browser console for errors
- Ensure all files are present

**Cannot Connect to Server**
- Make sure Express server is running: `bun run server:dev`
- Verify server is accessible at `http://localhost:3000`
- Check server terminal for errors
- Try restarting the server

**Slow Responses**
- Check your internet connection
- Google AI API may have high latency during peak times
- Consider upgrading to paid tier for faster responses

### Debug Mode
1. Open `chrome://extensions/`
2. Find the extension and click "Details"
3. Enable "Developer mode" for detailed error logs
4. Check browser console for additional information

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with detailed description

### Development Setup
```bash
# Clone the repository
git clone https://github.com/HiteshTripathi2005/chat-extension.git
cd chat-extension

# Install all dependencies
npm run install:all

# Development workflow - Run these in separate terminals:

# Terminal 1: Start Express server
npm run server:dev    # Auto-restart on server changes

# Terminal 2: Build extension
npm run watch    # Auto-rebuild on file changes (recommended)
# or
npm run dev      # Same as watch with development mode
# or
npm run build    # One-time build

# Alternative: Run both client and server together
npm run dev:all  # Runs server:dev & watch in parallel

# Load extension in Chrome:
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" and select the `client/` folder
# 4. Make changes and see them auto-reload

# Submit pull request
```

## 📊 Performance & Limits

### Free Tier Limits
- 60 requests per minute
- 1,500 requests per day
- 32,000 tokens per minute
- Standard model access

### Cost Estimation
- Free tier: $0 (up to limits)
- Paid tier: $0.00025 per 1K characters (input)
- Paid tier: $0.0005 per 1K characters (output)

## 🔒 Privacy & Security

### Data Handling
- API keys stored locally in Chrome's secure storage
- Webpage content processed temporarily for AI responses
- No data sent to external servers except Google AI API
- User consent required for content analysis

### Security Measures
- HTTPS-only API communications
- Input validation and sanitization
- Rate limiting to prevent abuse
- Secure key encryption

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google AI for the Gemini 2.0 Flash model
- Chrome Extensions documentation
- Open source community for inspiration

## 📞 Support

- Create an issue on GitHub for bugs or feature requests
- Check the troubleshooting section above
- Join our community discussions

---

**Made with ❤️ using Google's Gemini AI**