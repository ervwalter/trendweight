import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistedState } from "./use-persisted-state";

describe("usePersistedState", () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };

  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns default value when localStorage is empty", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => usePersistedState("testKey", "defaultValue"));

    expect(result.current[0]).toBe("defaultValue");
  });

  it("returns value from localStorage when available", () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify("storedValue"));

    const { result } = renderHook(() => usePersistedState("testKey", "defaultValue"));

    expect(result.current[0]).toBe("storedValue");
  });

  it("stores value in localStorage when state changes", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => usePersistedState("testKey", "initial"));

    act(() => {
      result.current[1]("newValue");
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith("testKey", JSON.stringify("newValue"));
    expect(result.current[0]).toBe("newValue");
  });

  it("handles complex data types", () => {
    const complexData = { foo: "bar", count: 42, nested: { value: true } };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(complexData));

    const { result } = renderHook(() => usePersistedState("complexKey", {}));

    expect(result.current[0]).toEqual(complexData);
  });

  it("handles localStorage errors gracefully when reading", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("Storage error");
    });

    const { result } = renderHook(() => usePersistedState("errorKey", "fallback"));

    expect(result.current[0]).toBe("fallback");
    expect(consoleSpy).toHaveBeenCalledWith('Error reading localStorage key "errorKey":', expect.any(Error));
  });

  it("handles localStorage errors gracefully when writing", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error("Storage error");
    });

    const { result } = renderHook(() => usePersistedState("writeErrorKey", "initial"));

    act(() => {
      result.current[1]("newValue");
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error setting localStorage key "writeErrorKey":', expect.any(Error));
    // State should still update even if localStorage fails
    expect(result.current[0]).toBe("newValue");
  });

  it("handles invalid JSON in localStorage", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorageMock.getItem.mockReturnValue("invalid json {");

    const { result } = renderHook(() => usePersistedState("invalidKey", "default"));

    expect(result.current[0]).toBe("default");
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("updates localStorage when key changes", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result, rerender } = renderHook(({ key }) => usePersistedState(key, "default"), { initialProps: { key: "key1" } });

    act(() => {
      result.current[1]("value1");
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith("key1", JSON.stringify("value1"));

    // Change the key
    rerender({ key: "key2" });

    act(() => {
      result.current[1]("value2");
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith("key2", JSON.stringify("value2"));
  });

  it("works with numeric types", () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(42));

    const { result } = renderHook(() => usePersistedState<number>("numKey", 0));

    expect(result.current[0]).toBe(42);

    act(() => {
      result.current[1](100);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith("numKey", JSON.stringify(100));
  });

  it("works with boolean types", () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(true));

    const { result } = renderHook(() => usePersistedState<boolean>("boolKey", false));

    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1](false);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith("boolKey", JSON.stringify(false));
  });
});
