export interface ProviderProgress {
  provider: string;
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
