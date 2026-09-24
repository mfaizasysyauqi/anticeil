import { api } from '@/lib/api';

export type GitHubRunnerStatus = {
  connected: false;
} | {
  connected: true;
  username: string;
  repoName: string;
  repoUrl: string;
};

export type GitHubConnectRequest = {
  token: string;
  repoName?: string;
};

export type GitHubConnectResponse = {
  success: boolean;
  username?: string;
  repoName?: string;
  repoUrl?: string;
  message: string;
};

export const githubRunnerApi = {
  getStatus: (): Promise<GitHubRunnerStatus> =>
    api.get<GitHubRunnerStatus>('/v1/github/status'),

  connect: (data: GitHubConnectRequest): Promise<GitHubConnectResponse> =>
    api.post<GitHubConnectResponse>('/v1/github/connect', data),

  dispatch: (data: {
    flowId: string;
    runId?: string;
    inputPayload?: Record<string, unknown>;
  }): Promise<{ success: boolean; message: string }> =>
    api.post('/v1/github/dispatch', data),
};
