// Cloudflare Workers Type Definitions (Self-contained fallback if types package is not yet installed)
export type CloudflareFetcher = {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

export type CloudflareWorkflowInstance = {
  id: string;
};

export type CloudflareWorkflow = {
  create: (options: { id?: string; params?: unknown }) => Promise<CloudflareWorkflowInstance>;
  get: (id: string) => Promise<unknown>;
};

export type CloudflareR2Bucket = {
  get: (key: string) => Promise<unknown>;
  put: (key: string, value: unknown) => Promise<unknown>;
  delete: (key: string) => Promise<void>;
};

export interface Env {
  // Bindings
  MY_BROWSER: CloudflareFetcher;
  FLOW_WORKFLOW: CloudflareWorkflow;
  ASSETS_BUCKET: CloudflareR2Bucket;

  // Secrets & Vars
  ENVIRONMENT?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export interface FlowStep {
  id: string;
  name: string;
  type: 'PIECE' | 'BROWSER_SCRAPE' | 'HTTP' | 'AI_GROQ' | 'CODE';
  actionName?: string;
  settings?: Record<string, unknown>;
}

export interface FlowRunPayload {
  flowId: string;
  flowRunId: string;
  userId: string;
  steps: FlowStep[];
  initialTriggerPayload?: Record<string, unknown>;
}
