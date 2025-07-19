export interface BuildTimeInfo {
  localTime: string;
  utcTime: string;
  ageText: string;
}

export function formatBuildTime(timestamp: string): BuildTimeInfo | string {
  if (timestamp === "Not available") return timestamp;
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const localTime = date.toLocaleString();
    const utcTime = date.toUTCString();

    let ageText = "";
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        ageText = `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
      } else {
        ageText = `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
      }
    } else if (diffDays === 1) {
      ageText = "1 day ago";
    } else {
      ageText = `${diffDays} days ago`;
    }

    return { localTime, utcTime, ageText };
  } catch {
    return timestamp;
  }
}
