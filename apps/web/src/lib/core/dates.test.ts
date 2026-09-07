import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LocalDate, LocalDateTime } from "@js-joda/core";
import { shortDate, recentDate, formatGoalDate } from "./dates";

describe("dates", () => {
  describe("formatGoalDate", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("uses a full date with on/around for goals up to 180 days away", () => {
      const soon = formatGoalDate(LocalDate.of(2024, 2, 20));
      expect(soon.preposition).toBe("on/around");
      expect(soon.date).toBe(shortDate(LocalDate.of(2024, 2, 20)));

      const boundary = formatGoalDate(LocalDate.of(2024, 1, 15).plusDays(180));
      expect(boundary.preposition).toBe("on/around");
    });

    it("switches to month and year with in/around beyond 180 days", () => {
      const result = formatGoalDate(LocalDate.of(2024, 1, 15).plusDays(181));

      expect(result.preposition).toBe("in/around");
      expect(result.date).toMatch(/jul/i);
      expect(result.date).toMatch(/2024/);
      expect(result.date).not.toMatch(/14|15/);
    });

    it("treats a past goal date as near", () => {
      const result = formatGoalDate(LocalDate.of(2023, 12, 1));

      expect(result.preposition).toBe("on/around");
      expect(result.date).toBe(shortDate(LocalDate.of(2023, 12, 1)));
    });

    it("accepts a LocalDateTime", () => {
      const result = formatGoalDate(LocalDateTime.of(2025, 3, 1, 8, 30));

      expect(result.preposition).toBe("in/around");
      expect(result.date).toMatch(/mar/i);
      expect(result.date).toMatch(/2025/);
    });
  });

  describe("shortDate", () => {
    it("should format LocalDate with medium date style", () => {
      const date = LocalDate.of(2024, 1, 15);
      const result = shortDate(date);

      // Should contain month, day, and year in some format
      expect(result).toMatch(/jan|january/i);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it("should format LocalDateTime with medium date style", () => {
      const dateTime = LocalDateTime.of(2024, 6, 10, 14, 30);
      const result = shortDate(dateTime);

      // Should contain month, day, and year in some format
      expect(result).toMatch(/jun|june/i);
      expect(result).toMatch(/10/);
      expect(result).toMatch(/2024/);
    });

    it("should handle different months", () => {
      const march = LocalDate.of(2024, 3, 5);
      const december = LocalDate.of(2024, 12, 25);

      const marchResult = shortDate(march);
      const decemberResult = shortDate(december);

      expect(marchResult).toMatch(/mar|march/i);
      expect(decemberResult).toMatch(/dec|december/i);
    });

    it("should handle leap year dates", () => {
      const leapDay = LocalDate.of(2024, 2, 29);
      const result = shortDate(leapDay);

      expect(result).toMatch(/feb|february/i);
      expect(result).toMatch(/29/);
      expect(result).toMatch(/2024/);
    });

    it("should handle different years", () => {
      const date2023 = LocalDate.of(2023, 5, 15);
      const date2025 = LocalDate.of(2025, 5, 15);

      const result2023 = shortDate(date2023);
      const result2025 = shortDate(date2025);

      expect(result2023).toMatch(/2023/);
      expect(result2025).toMatch(/2025/);
    });
  });

  describe("recentDate", () => {
    it("should format LocalDate with weekday, month, and day", () => {
      const date = LocalDate.of(2024, 1, 15); // This is a Monday
      const result = recentDate(date);

      // Should contain weekday, month, and day
      expect(result).toMatch(/mon|monday/i);
      expect(result).toMatch(/jan|january/i);
      expect(result).toMatch(/15/);
    });

    it("should format LocalDateTime with weekday, month, and day", () => {
      const dateTime = LocalDateTime.of(2024, 6, 10, 14, 30); // This is a Monday
      const result = recentDate(dateTime);

      // Should contain weekday, month, and day
      expect(result).toMatch(/mon|monday/i);
      expect(result).toMatch(/jun|june/i);
      expect(result).toMatch(/10/);
    });

    it("should handle different weekdays", () => {
      const monday = LocalDate.of(2024, 1, 15);
      const friday = LocalDate.of(2024, 1, 19);
      const sunday = LocalDate.of(2024, 1, 21);

      const mondayResult = recentDate(monday);
      const fridayResult = recentDate(friday);
      const sundayResult = recentDate(sunday);

      expect(mondayResult).toMatch(/mon/i);
      expect(fridayResult).toMatch(/fri/i);
      expect(sundayResult).toMatch(/sun/i);
    });

    it("should handle different months", () => {
      const january = LocalDate.of(2024, 1, 15);
      const july = LocalDate.of(2024, 7, 15);

      const januaryResult = recentDate(january);
      const julyResult = recentDate(july);

      expect(januaryResult).toMatch(/jan/i);
      expect(julyResult).toMatch(/jul/i);
    });

    it("should not include year in recent date format", () => {
      const date = LocalDate.of(2024, 5, 15);
      const result = recentDate(date);

      // Recent date format typically doesn't include year
      expect(result).not.toMatch(/2024/);
    });

    it("should handle edge cases like month boundaries", () => {
      const firstOfMonth = LocalDate.of(2024, 3, 1);
      const lastOfMonth = LocalDate.of(2024, 3, 31);

      const firstResult = recentDate(firstOfMonth);
      const lastResult = recentDate(lastOfMonth);

      expect(firstResult).toMatch(/mar/i);
      expect(firstResult).toMatch(/1/);
      expect(lastResult).toMatch(/mar/i);
      expect(lastResult).toMatch(/31/);
    });
  });

  describe("date consistency", () => {
    it("should handle the same date in both LocalDate and LocalDateTime formats", () => {
      const localDate = LocalDate.of(2024, 4, 10);
      const localDateTime = LocalDateTime.of(2024, 4, 10, 12, 0);

      const shortDateResult = shortDate(localDate);
      const shortDateTimeResult = shortDate(localDateTime);

      const recentDateResult = recentDate(localDate);
      const recentDateTimeResult = recentDate(localDateTime);

      // Both should format the date part identically
      expect(shortDateResult).toBe(shortDateTimeResult);
      expect(recentDateResult).toBe(recentDateTimeResult);
    });

    it("should handle time components in LocalDateTime being ignored", () => {
      const midnight = LocalDateTime.of(2024, 5, 20, 0, 0);
      const noon = LocalDateTime.of(2024, 5, 20, 12, 0);
      const endOfDay = LocalDateTime.of(2024, 5, 20, 23, 59);

      const midnightShort = shortDate(midnight);
      const noonShort = shortDate(noon);
      const endOfDayShort = shortDate(endOfDay);

      const midnightRecent = recentDate(midnight);
      const noonRecent = recentDate(noon);
      const endOfDayRecent = recentDate(endOfDay);

      // All should be identical since only date part matters
      expect(midnightShort).toBe(noonShort);
      expect(noonShort).toBe(endOfDayShort);
      expect(midnightRecent).toBe(noonRecent);
      expect(noonRecent).toBe(endOfDayRecent);
    });
  });
});
