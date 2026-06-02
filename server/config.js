// Central config constants. Grow this as needed.

// Anthropic model used by the /api/chat proxy.
export const MODEL = 'claude-sonnet-4-6';

// Backend port. Override with PORT in .env.
export const PORT = process.env.PORT || 3001;

// How many recent chat messages to load into each chat call (memory window).
export const HISTORY_LIMIT = 20;
