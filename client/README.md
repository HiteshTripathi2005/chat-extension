# Zenix Chrome Extension (Client)

This folder contains the Chrome extension code for Zenix AI Assistant.

## Structure

```
client/
├── manifest.json           # Extension manifest (Manifest V3)
├── webpack.config.js       # Webpack build configuration
├── logo.png               # Extension icon
├── main-logo.png          # Additional branding
├── src/                   # Source files
│   ├── background.js      # Service worker (HTTP client)
│   ├── content.js         # DOM element selection
│   ├── sidepanel.html     # UI markup
│   ├── sidepanel.js       # UI logic
│   ├── index.css          # Styles
│   ├── utils/
│   │   └── prompt.js      # AI prompt construction
│   └── tools/
│       └── time-tool.js   # Utility tools
└── dist/                  # Built files (generated)
    ├── background.js
    ├── content.js
    └── sidepanel.js
```

## Development

### Build Commands

From the **project root**:

```bash
# Development mode (auto-rebuild on changes)
bun run dev

# Production build
bun run build

# Watch mode
bun run watch
```

### Loading in Chrome

1. Build the extension (see above)
2. Open Chrome: `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `client/` folder
6. Extension is now loaded!

## Key Components

### Background Script (`src/background.js`)
- Acts as HTTP client to Express server
- Coordinates messages between components
- Handles webpage content extraction
- Manages element selection state

### Side Panel (`src/sidepanel.html/js`)
- Chat interface
- Settings panel
- Conversation history
- Real-time streaming UI

### Content Script (`src/content.js`)
- DOM element selection with visual overlays
- Content extraction
- User interaction handling

## Build System

Uses **Webpack** to bundle ES modules:
- Entry points: `background.js`, `content.js`, `sidepanel.js`
- Output: `dist/` folder
- Source maps: Enabled in development

## Dependencies

Extension-specific:
- `marked` - Markdown rendering
- Chrome APIs (no external dependencies needed)

Build tools:
- `webpack` - Module bundler
- `webpack-cli` - CLI interface

## Development Tips

1. **Auto-reload**: Extension reloads automatically on rebuild
2. **Debugging**: Use Chrome DevTools for each context
3. **Manifest**: Changes require extension reload
4. **Permissions**: Declared in `manifest.json`

## Troubleshooting

### Extension not loading
- Ensure `dist/` folder exists and has built files
- Check for manifest.json errors
- Reload extension in Chrome

### Changes not appearing
- Check if webpack is rebuilding (watch terminal)
- Reload extension in Chrome
- Clear browser cache if needed

## Testing

1. Load extension in Chrome
2. Navigate to any webpage
3. Click extension icon
4. Open side panel
5. Test features

## Production Build

```bash
bun run build
```

Then submit the `client/` folder to Chrome Web Store.
