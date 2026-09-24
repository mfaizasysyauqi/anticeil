import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { githubRunnerApi, GitHubConnectRequest } from '../api/github-runner';

const GITHUB_RUNNER_STATUS_KEY = ['github-runner-status'];

export function useGitHubRunnerStatus() {
  return useQuery({
    queryKey: GITHUB_RUNNER_STATUS_KEY,
    queryFn: () => githubRunnerApi.getStatus(),
    staleTime: 30_000,
  });
}

export function useConnectGitHubRunner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GitHubConnectRequest) => githubRunnerApi.connect(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GITHUB_RUNNER_STATUS_KEY });
    },
  });
}
