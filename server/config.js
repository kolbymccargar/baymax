// Central config constants. Grow this as needed.

// Anthropic model used by the /api/chat proxy.
export const MODEL = 'claude-sonnet-4-6';

// Backend port. Override with PORT in .env.
export const PORT = process.env.PORT || 3001;

// How many recent chat messages to load into each chat call (memory window).
export const HISTORY_LIMIT = 20;

// Obsidian vault integration — read-only notes injected into every briefing.
// Add, remove, or reorder paths here to control what Baymax reads.
// Missing files are skipped gracefully; no crash, no noise.
export const VAULT_NOTES = [
  'C:\\Users\\silly\\Brain\\Dashboard\\00-Dashboard.md',
  'C:\\Users\\silly\\Brain\\Finances\\Revenue-Tracker.md',
  'C:\\Users\\silly\\Brain\\Finances\\Growth-Targets.md',
];
