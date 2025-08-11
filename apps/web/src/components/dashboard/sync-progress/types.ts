export interface ProviderProgress {
  provider: "fitbit" | "withings";
  stage: "init" | "fetching" | "merging" | "done" | "error";
  message: string | null;
  current: number | null;
  total: number | null;
}

export interface SyncProgress {
  id: string;
  status: "starting" | "running" | "done";
  message: string | null;
  providers: ProviderProgress[] | null;
}
