import { describe, it, expect, vi, beforeEach } from "vitest";
import { authSuspenseManager } from "./authSuspense";

describe("authSuspenseManager", () => {
  beforeEach(() => {
    // Reset the manager state
    authSuspenseManager.setInitializing(true);
  });

  describe("isAuthInitializing", () => {
    it("should return current initialization state", () => {
      expect(authSuspenseManager.isAuthInitializing).toBe(true);

      authSuspenseManager.setInitializing(false);
      expect(authSuspenseManager.isAuthInitializing).toBe(false);
    });
  });

  describe("getPromise", () => {
    it("should return resolved promise when not initializing", async () => {
      authSuspenseManager.setInitializing(false);

      const promise = authSuspenseManager.getPromise();
      await expect(promise).resolves.toBeUndefined();
    });

    it("should return pending promise when initializing", () => {
      const promise = authSuspenseManager.getPromise();

      // Promise should be pending (not resolved or rejected)
      let isResolved = false;
      promise.then(() => {
        isResolved = true;
      });

      // Give it a tick to potentially resolve
      return Promise.resolve().then(() => {
        expect(isResolved).toBe(false);
      });
    });

    it("should resolve promise when initialization completes", async () => {
      const promise = authSuspenseManager.getPromise();

      // Set initializing to false to resolve the promise
      authSuspenseManager.setInitializing(false);

      await expect(promise).resolves.toBeUndefined();
    });

    it("should return same promise instance for multiple calls", () => {
      const promise1 = authSuspenseManager.getPromise();
      const promise2 = authSuspenseManager.getPromise();

      expect(promise1).toBe(promise2);
    });

    it("should resolve all pending promises when initialization completes", async () => {
      const promises = [authSuspenseManager.getPromise(), authSuspenseManager.getPromise(), authSuspenseManager.getPromise()];

      authSuspenseManager.setInitializing(false);

      await expect(Promise.all(promises)).resolves.toEqual([undefined, undefined, undefined]);
    });

    it("should create new promise after previous one resolved", async () => {
      const promise1 = authSuspenseManager.getPromise();
      authSuspenseManager.setInitializing(false);
      await promise1;

      // Reset to initializing state
      authSuspenseManager.setInitializing(true);

      const promise2 = authSuspenseManager.getPromise();
      expect(promise1).not.toBe(promise2);

      // Promise2 should be pending
      let isResolved = false;
      promise2.then(() => {
        isResolved = true;
      });

      await Promise.resolve();
      expect(isResolved).toBe(false);
    });
  });

  describe("subscribe", () => {
    it("should call subscriber immediately with current state", () => {
      const subscriber = vi.fn();

      authSuspenseManager.subscribe(subscriber);

      expect(subscriber).toHaveBeenCalledWith(true);
    });

    it("should notify subscribers when state changes", () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();

      authSuspenseManager.subscribe(subscriber1);
      authSuspenseManager.subscribe(subscriber2);

      // Clear initial calls
      subscriber1.mockClear();
      subscriber2.mockClear();

      authSuspenseManager.setInitializing(false);

      expect(subscriber1).toHaveBeenCalledWith(false);
      expect(subscriber2).toHaveBeenCalledWith(false);
    });

    it("should return unsubscribe function", () => {
      const subscriber = vi.fn();

      const unsubscribe = authSuspenseManager.subscribe(subscriber);

      // Clear initial call
      subscriber.mockClear();

      // Unsubscribe
      unsubscribe();

      // Should not be called after unsubscribe
      authSuspenseManager.setInitializing(false);
      expect(subscriber).not.toHaveBeenCalled();
    });

    it("should handle multiple unsubscribes correctly", () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();
      const subscriber3 = vi.fn();

      const unsubscribe1 = authSuspenseManager.subscribe(subscriber1);
      const unsubscribe2 = authSuspenseManager.subscribe(subscriber2);
      const unsubscribe3 = authSuspenseManager.subscribe(subscriber3);

      // Clear initial calls
      subscriber1.mockClear();
      subscriber2.mockClear();
      subscriber3.mockClear();

      // Unsubscribe the middle one
      unsubscribe2();

      authSuspenseManager.setInitializing(false);

      expect(subscriber1).toHaveBeenCalledWith(false);
      expect(subscriber2).not.toHaveBeenCalled();
      expect(subscriber3).toHaveBeenCalledWith(false);

      // Unsubscribe remaining
      unsubscribe1();
      unsubscribe3();

      subscriber1.mockClear();
      subscriber3.mockClear();

      authSuspenseManager.setInitializing(true);

      expect(subscriber1).not.toHaveBeenCalled();
      expect(subscriber3).not.toHaveBeenCalled();
    });
  });

  describe("integration", () => {
    it("should handle complete auth flow", async () => {
      const subscriber = vi.fn();

      // Subscribe to state changes
      const unsubscribe = authSuspenseManager.subscribe(subscriber);

      // Get promise while initializing
      const promise = authSuspenseManager.getPromise();

      expect(subscriber).toHaveBeenCalledWith(true);
      subscriber.mockClear();

      // Complete initialization
      authSuspenseManager.setInitializing(false);

      // Promise should resolve
      await expect(promise).resolves.toBeUndefined();

      // Subscriber should be notified
      expect(subscriber).toHaveBeenCalledWith(false);

      // New promise should resolve immediately
      const promise2 = authSuspenseManager.getPromise();
      await expect(promise2).resolves.toBeUndefined();

      // Cleanup
      unsubscribe();
    });
  });
});
