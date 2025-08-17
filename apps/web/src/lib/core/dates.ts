import { ChronoUnit, convert, LocalDate, LocalDateTime } from "@js-joda/core";

const shortDateFormatter = Intl.DateTimeFormat([], {
  dateStyle: "medium",
});

const recentDateFormatter = new Intl.DateTimeFormat([], {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const monthYearFormatter = new Intl.DateTimeFormat([], {
  month: "short",
  year: "numeric",
});

export const shortDate = (date: LocalDate | LocalDateTime) => {
  const nativeDate = convert(date).toDate();
  return shortDateFormatter.format(nativeDate);
};

export const recentDate = (date: LocalDate | LocalDateTime) => {
  const nativeDate = convert(date).toDate();
  return recentDateFormatter.format(nativeDate);
};

export const formatGoalDate = (date: LocalDate | LocalDateTime) => {
  const now = LocalDate.now();
  const targetDate = date instanceof LocalDateTime ? date.toLocalDate() : date;
  const daysUntil = now.until(targetDate, ChronoUnit.DAYS);

  const nativeDate = convert(date).toDate();

  // Use month/year format if more than 120 days away
  if (daysUntil > 120) {
    return {
      preposition: "in/around",
      date: monthYearFormatter.format(nativeDate),
    };
  } else {
    return {
      preposition: "on/around",
      date: shortDateFormatter.format(nativeDate),
    };
  }
};
