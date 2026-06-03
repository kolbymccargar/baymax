// Read-only Obsidian vault integration.
// Reads configured markdown files at briefing time so Baymax always has the
// latest business context. Never writes to the vault.
import fs from 'node:fs';
import path from 'node:path';

function readNote(filePath) {
  const label = path.basename(filePath, '.md');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { label, content: content.trim(), ok: true };
  } catch {
    return { label, content: null, ok: false };
  }
}

// Build a formatted vault block ready to append to the system prompt.
// Returns null if every configured path is missing or the list is empty.
export function readVaultNotes(filePaths) {
  if (!filePaths?.length) return null;

  const results = filePaths.map(readNote);
  const loaded  = results.filter((r) => r.ok);
  if (!loaded.length) return null;

  const failed = results.filter((r) => !r.ok);
  const warning = failed.length
    ? `\n[Skipped — could not read: ${failed.map((r) => r.label).join(', ')}]`
    : '';

  const sections = loaded
    .map((r) => `--- ${r.label} ---\n${r.content}`)
    .join('\n\n');

  return `=== BUSINESS CONTEXT (Obsidian vault — read-only, current as of this request) ===${warning}\n\n${sections}`;
}
