// Shared between middleware (edge runtime) and API routes (node runtime), so
// this uses only Web Crypto (available in both) rather than node:crypto.

export const SESSION_COOKIE = 'siriai_admin_session';

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function expectedSessionToken() {
  const password = process.env.ADMIN_PASSWORD || '';
  return sha256Hex(`siriai-admin:${password}`);
}

export async function isValidSession(cookieValue) {
  if (!cookieValue) return false;
  const expected = await expectedSessionToken();
  return cookieValue === expected;
}
