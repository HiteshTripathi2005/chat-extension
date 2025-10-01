# Zenix Express Server

Backend server for the Zenix Chrome extension, handling AI processing and API calls to Google Gemini.

## Structure

```
server/
├── index.js              # Express server entry point
├── package.json          # Server-specific dependencies (optional)
└── src/
    ├── config.js         # Server configuration
    ├── routes/
    │   └── ai.js        # AI API routes
    └── controllers/
        └── aiController.js  # AI processing logic
```

## Running the Server

From the **project root**:

```bash
# Development mode (auto-restart)
bun run server:dev

# Production mode
bun run server
```

Server runs on: `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "message": "Zenix AI Server is running"
}
```

### AI Service Health
```
GET /api/ai/health
```

### Stream AI Response
```
POST /api/ai/stream
Content-Type: application/json
```

Request:
```json
{
  "message": "User question",
  "webpageContent": {
    "title": "Page title",
    "description": "Page description",
    "content": "Page content...",
    "url": "https://example.com"
  },
  "history": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ],
  "apiKey": "your_google_ai_api_key"
}
```

Response: Server-Sent Events (SSE) stream

## Configuration

Edit `src/config.js` to customize:
- Port number
- CORS settings
- AI model parameters
- Temperature, max tokens, etc.

## Dependencies

Server-specific:
- `express` - Web framework
- `cors` - Cross-origin support
- `@ai-sdk/google` - Google AI SDK
- `ai` - Vercel AI SDK
- `zod` - Validation

Dev dependencies:
- `nodemon` - Auto-restart

## Development

### Adding New Routes

1. Create route in `src/routes/`
2. Create controller in `src/controllers/`
3. Import and use in `index.js`

Example:
```javascript
// src/routes/example.js
import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Hello' });
});

export default router;

// index.js
import exampleRoutes from './src/routes/example.js';
app.use('/api/example', exampleRoutes);
```

### Error Handling

All errors are caught by middleware and returned as JSON:
```json
{
  "error": "Error message",
  "status": 500
}
```

## Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test AI endpoint
curl -X POST http://localhost:3000/api/ai/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","webpageContent":{...},"apiKey":"..."}'
```

## Environment Variables

Create `.env` file (optional):
```env
PORT=3000
NODE_ENV=development
```

## Security

- API keys passed in requests (not stored)
- CORS enabled for Chrome extension
- Input validation on all endpoints
- Error sanitization

## Deployment

### Local
```bash
bun run server
```

### Production
- Deploy to Heroku, Railway, Render, etc.
- Set environment variables
- Update extension's `EXPRESS_SERVER_URL`
- Use HTTPS

## Troubleshooting

### Port already in use
```bash
# Find process
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or use different port
echo "PORT=3001" > .env
```

### Connection refused
- Ensure server is running
- Check firewall settings
- Verify port number

### API errors
- Check server logs
- Verify API key
- Review Google AI quota

## Performance

- Streaming responses for real-time UX
- Content size limits (10k/15k chars)
- Conversation history limited to 20 messages

## Monitoring

Add logging middleware:
```javascript
import morgan from 'morgan';
app.use(morgan('dev'));
```

## Future Enhancements

- [ ] Rate limiting (express-rate-limit)
- [ ] Request logging (Morgan)
- [ ] Redis caching
- [ ] WebSocket support
- [ ] Load balancing
- [ ] Docker containerization
