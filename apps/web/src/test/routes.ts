import type { QueryClient } from "@tanstack/react-query";
import { isRedirect, type AnyRedirect, type ParsedLocation } from "@tanstack/router-core";
import { expect, vi } from "vitest";
import type { AuthState } from "@/lib/auth/use-auth";
import type { RouterContext } from "@/router";
import { authState } from "./auth";
import { createTestQueryClient } from "./query-client";

// Any TanStack route object (the `Route` export of a file in src/routes). Typed loosely so no
// test needs the generated route tree.
export interface RouteLike {
  options: {
    loader?: unknown;
    beforeLoad?: unknown;
  };
}

export interface RouterContextOptions {
  queryClient?: QueryClient;
  auth?: Partial<AuthState>;
}

// The context routes receive (see src/router.tsx): a signed-in auth state and a test QueryClient
// unless overridden.
export function routerContext({ queryClient = createTestQueryClient(), auth = {} }: RouterContextOptions = {}): RouterContext {
  return { queryClient, auth: authState(auth) };
}

export interface RouteRunOptions {
  context?: RouterContext;
  params?: Record<string, string>;
  // A pathname (search/hash derived from it) or a partial ParsedLocation
  location?: string | Partial<ParsedLocation>;
  search?: Record<string, unknown>;
}

function parsedLocation(location: string | Partial<ParsedLocation> = "/"): ParsedLocation {
  if (typeof location === "string") {
    const url = new URL(location, "http://localhost");
    const href = url.pathname + url.search + url.hash;
    return {
      href,
      publicHref: href,
      external: false,
      pathname: url.pathname,
      search: Object.fromEntries(url.searchParams.entries()),
      searchStr: url.search,
      hash: url.hash.replace(/^#/, ""),
      state: { key: "test", __TSR_index: 0 },
    };
  }
  const pathname = location.pathname ?? "/";
  const searchStr = location.searchStr ?? "";
  const href = location.href ?? pathname + searchStr;
  return {
    href,
    publicHref: location.publicHref ?? href,
    external: location.external ?? false,
    pathname,
    search: location.search ?? {},
    searchStr,
    hash: location.hash ?? "",
    state: location.state ?? { key: "test", __TSR_index: 0 },
    ...(location.maskedLocation ? { maskedLocation: location.maskedLocation } : {}),
    ...(location.unmaskOnReload !== undefined ? { unmaskOnReload: location.unmaskOnReload } : {}),
  };
}

function baseContext(route: RouteLike, { context = routerContext(), params = {}, location, search }: RouteRunOptions) {
  return {
    abortController: new AbortController(),
    preload: false,
    params,
    context,
    location: parsedLocation(location),
    search: search ?? parsedLocation(location).search,
    navigate: vi.fn(),
    cause: "enter" as const,
    route,
    matches: [],
    buildLocation: vi.fn(),
  };
}

// Invokes a route's loader directly (no router) with the same shape of arguments the router
// passes. Rejects with whatever the loader throws, including redirects.
export function runLoader(route: RouteLike, options: RouteRunOptions = {}): Promise<unknown> {
  const { loader } = route.options;
  if (typeof loader !== "function") {
    throw new Error("Route has no loader function");
  }
  const ctx = { ...baseContext(route, options), deps: {}, parentMatchPromise: Promise.resolve({}) };
  return Promise.resolve().then(() => loader(ctx));
}

// Invokes a route's beforeLoad directly (no router).
export function runBeforeLoad(route: RouteLike, options: RouteRunOptions = {}): Promise<unknown> {
  const { beforeLoad } = route.options;
  if (typeof beforeLoad !== "function") {
    throw new Error("Route has no beforeLoad function");
  }
  const ctx = baseContext(route, options);
  return Promise.resolve().then(() => beforeLoad(ctx));
}

export interface ExpectedRedirect {
  to: string;
  replace?: boolean;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
}

// Asserts the promise rejects with a TanStack redirect matching the given options and returns the
// redirect so callers can inspect anything else (statusCode, headers, ...).
export async function expectRedirect(promise: Promise<unknown>, expected: ExpectedRedirect): Promise<AnyRedirect> {
  const thrown = await promise.then(
    (value) => ({ resolved: true as const, value }),
    (error: unknown) => ({ resolved: false as const, error }),
  );

  expect(thrown, "expected a redirect to be thrown but the promise resolved").toMatchObject({ resolved: false });
  const error = thrown.resolved ? undefined : thrown.error;
  expect(error, `expected a redirect but got ${describeThrown(error)}`).toSatisfy(isRedirect);

  const redirect = error as AnyRedirect;
  const expectedOptions = Object.fromEntries(Object.entries(expected).filter(([, value]) => value !== undefined));
  expect(redirect.options).toMatchObject(expectedOptions);
  return redirect;
}

function describeThrown(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
