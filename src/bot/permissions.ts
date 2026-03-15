/**
 * Group-based permissions system.
 *
 * TELEGRAM_CHAT_ID = admin (full access to all commands)
 * TELEGRAM_GROUP_SITES = mapping of group chat IDs to site keys
 *   Format: "chatId1:siteKey1,chatId2:siteKey2"
 *   Example: "-100123456:voitures,-100789012:garage"
 *
 * Commands are tagged with a required site key (or 'admin' for admin-only).
 * A group chat can only run commands associated with its site.
 */

const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// Parse TELEGRAM_GROUP_SITES env var
function parseGroupSites(): Map<string, string> {
  const map = new Map<string, string>();
  const raw = process.env.TELEGRAM_GROUP_SITES || '';
  if (!raw) return map;

  for (const entry of raw.split(',')) {
    const [chatId, siteKey] = entry.trim().split(':');
    if (chatId && siteKey) {
      map.set(chatId.trim(), siteKey.trim());
    }
  }
  return map;
}

const groupSites = parseGroupSites();

/** Check if a chat ID is authorized at all (admin or a configured group) */
export function isAuthorized(chatId: string): boolean {
  return chatId === ADMIN_CHAT_ID || groupSites.has(chatId);
}

/** Check if a chat is the admin */
export function isAdmin(chatId: string): boolean {
  return chatId === ADMIN_CHAT_ID;
}

/** Get the site key for a group chat. Returns undefined for admin (admin has access to all). */
export function getSiteForChat(chatId: string): string | undefined {
  return groupSites.get(chatId);
}

/**
 * Check if a chat can use a command for a given site key.
 * Admin can use everything. Groups can only use commands for their site.
 */
export function canAccessSite(chatId: string, siteKey: string): boolean {
  if (chatId === ADMIN_CHAT_ID) return true;
  return groupSites.get(chatId) === siteKey;
}

/**
 * Get the list of allowed site keys for a chat.
 * Admin gets all sites. Group gets only its assigned site.
 */
export function getAllowedSites(chatId: string): string[] {
  if (chatId === ADMIN_CHAT_ID) return ['*']; // all sites
  const site = groupSites.get(chatId);
  return site ? [site] : [];
}
