import { t } from 'i18next';
import { AlertCircle, CheckCircle2, Github, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  useConnectGitHubRunner,
  useGitHubRunnerStatus,
} from '@/features/connections/hooks/github-runner-hooks';

export default function GitHubRunnerPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{t('GitHub Serverless Runner')}</h1>
        <p className="text-muted-foreground mt-1">
          {t(
            'Execute your flows using GitHub Actions — 2,000 free minutes/month per account.',
          )}
        </p>
      </div>
      <GitHubRunnerPanel />
    </div>
  );
}

function GitHubRunnerPanel() {
  const { data: status, isLoading } = useGitHubRunnerStatus();
  const { mutate: connect, isPending } = useConnectGitHubRunner();

  const [token, setToken] = useState('');
  const [repoName, setRepoName] = useState('anticeil-workflows');

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('Checking connection...')}
      </div>
    );
  }

  if (status?.connected) {
    return (
      <Card className="border-green-500/40 bg-green-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <CardTitle className="text-base">{t('Runner Connected')}</CardTitle>
          </div>
          <CardDescription>
            {t('Your flows will execute via GitHub Actions.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-muted-foreground">
              {status.username}/{status.repoName}
            </span>
          </div>
          <a
            href={status.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline text-xs"
          >
            {status.repoUrl}
          </a>
        </CardContent>
      </Card>
    );
  }

  const handleConnect = () => {
    if (!token.trim()) return;
    connect(
      { token: token.trim(), repoName: repoName.trim() || 'anticeil-workflows' },
      {
        onSuccess: (res) => {
          if (res.success) {
            toast({
              title: t('Runner connected!'),
              description: res.message,
            });
            setToken('');
          } else {
            toast({
              variant: 'destructive',
              title: t('Connection failed'),
              description: res.message,
            });
          }
        },
        onError: (err: any) => {
          toast({
            variant: 'destructive',
            title: t('Connection failed'),
            description: err?.message ?? t('Unknown error'),
          });
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          <CardTitle className="text-base">{t('Connect GitHub Account')}</CardTitle>
        </div>
        <CardDescription>
          {t(
            'Provide a GitHub Personal Access Token with repo and workflow scopes. Anticeil will create a private repo and deploy the runner workflow automatically.',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 flex gap-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {t(
              'Required token scopes: repo (full), workflow. Generate at github.com/settings/tokens.',
            )}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="github-token">{t('Personal Access Token')}</Label>
          <Input
            id="github-token"
            type="password"
            placeholder="ghp_..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="repo-name">{t('Workflow Repository Name')}</Label>
          <Input
            id="repo-name"
            placeholder="anticeil-workflows"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {t(
              'A private repo will be created in your GitHub account with this name.',
            )}
          </p>
        </div>

        <Button
          onClick={handleConnect}
          disabled={!token.trim() || isPending}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('Connecting...')}
            </>
          ) : (
            <>
              <Github className="mr-2 h-4 w-4" />
              {t('Connect GitHub Runner')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
