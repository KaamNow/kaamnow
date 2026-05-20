/**
 * Analytics wrapper. Calls PostHog when EXPO_PUBLIC_POSTHOG_KEY is set.
 * No-ops silently otherwise — never crashes the app.
 */
let _client = null;

function getClient() {
  if (_client) return _client;
  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const PostHog = require("posthog-react-native").default;
    _client = new PostHog(key, { host: "https://app.posthog.com" });
  } catch {}
  return _client;
}

export function identify(userId, traits = {}) {
  try { getClient()?.identify(userId, traits); } catch {}
}

export function track(event, props = {}) {
  try { getClient()?.capture(event, props); } catch {}
}

export function reset() {
  try { getClient()?.reset(); } catch {}
}
