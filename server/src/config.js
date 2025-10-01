export const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  ai: {
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    maxTokens: 2048
  },
  cors: {
    origin: '*', // Allow Chrome extension
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
  }
};

export default config;
