import { useState, useEffect, useCallback } from "react";

export function usePersistedState<T>(key: string, defaultValue: T, persist: boolean = true): [T, (value: T) => void] {
  // Initialize state with value from localStorage or default
  const [state, setState] = useState<T>(() => {
    if (!persist) {
      return defaultValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Update localStorage when state changes (only if persist is enabled)
  useEffect(() => {
    if (!persist) {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, state, persist]);

  // Wrapper to ensure type safety
  const setValue = useCallback((value: T) => {
    setState(value);
  }, []);

  return [state, setValue];
}
