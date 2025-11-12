import { useState, useEffect } from "react";

export function useChangelog(buildVersion: string, buildRepo: string, isTag: boolean, githubRepo: string | null) {
  const [changelog, setChangelog] = useState<string | null>(null);
  const [loadingChangelog, setLoadingChangelog] = useState(() => {
    // Initialize loading state based on whether we'll fetch
    return isTag && buildVersion !== "Not available" && buildVersion !== "local" && !!githubRepo;
  });

  useEffect(() => {
    if (isTag && buildVersion !== "Not available" && buildVersion !== "local" && githubRepo) {
      fetch(`https://api.github.com/repos/${buildRepo}/releases/tags/${buildVersion}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.body) {
            setChangelog(data.body);
          }
        })
        .catch((err) => console.error("Failed to fetch changelog:", err))
        .finally(() => setLoadingChangelog(false));
    }
  }, [buildVersion, buildRepo, githubRepo, isTag]);

  return { changelog, loadingChangelog };
}
