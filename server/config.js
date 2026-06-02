// Central config constants. Grow this as needed.

// Anthropic model used by the /api/chat proxy.
export const MODEL = 'claude-sonnet-4-6';

// Backend port. Override with PORT in .env.
export const PORT = process.env.PORT || 3001;
