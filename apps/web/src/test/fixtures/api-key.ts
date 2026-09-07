import type { ApiKeyMetadata, GeneratedApiKey } from "@/lib/api/types";

// GET /api/profile/api-key for a user who has a key
export function buildApiKeyMetadata(overrides: Partial<ApiKeyMetadata> = {}): ApiKeyMetadata {
  return {
    exists: true,
    suffix: "wxyz",
    createdAt: "2024-01-10T08:00:00Z",
    ...overrides,
  };
}

// POST /api/profile/api-key: the plaintext key is only ever returned here
export function buildGeneratedApiKey(overrides: Partial<GeneratedApiKey> = {}): GeneratedApiKey {
  return {
    apiKey: "sk-test0123456789abcdefghijklmnopwxyz",
    suffix: "wxyz",
    createdAt: "2024-01-15T12:00:00Z",
    ...overrides,
  };
}
