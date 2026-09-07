export interface OAuthCallbackSearch {
  code?: string;
  state?: string;
}

/** Validates the search params of a provider OAuth callback route (/oauth/$provider/callback) */
export function parseOAuthCallbackSearch(search: Record<string, unknown>): OAuthCallbackSearch {
  return {
    code: search.code ? String(search.code) : undefined,
    state: search.state ? String(search.state) : undefined,
  };
}
