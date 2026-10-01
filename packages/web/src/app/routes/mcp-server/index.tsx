import { t } from 'i18next';

import { LockedFeatureGuard } from '@/app/components/locked-feature-guard';
import { PageHeader } from '@/components/custom/page-header';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { piecesHooks } from '@/features/pieces/hooks/pieces-hooks';
import { platformHooks } from '@/hooks/platform-hooks';

import { ActivityTab } from './activity/activity-tab';
import { ConnectTab } from './connect/connect-tab';
import { GrantsTab } from './grants/grants-tab';
import { useMcpNav } from './mcp-nav';
import { useMcpServerUrl } from './mcp-server-url';
import { PageBand } from './page-band';
import { PiecesTab } from './pieces/pieces-tab';

export default function McpServerPage() {
  const { platform } = platformHooks.useCurrentPlatform();
  const mcpAvailable = platform?.plan?.aiProvidersEnabled || platform?.plan?.agentsEnabled;
  const { serverUrl, isReachableFromInternet } = useMcpServerUrl();
  const nav = useMcpNav();
  piecesHooks.usePrefetchPieces({ skipProjectFilter: true });

  return (
    <LockedFeatureGuard
      locked={!mcpAvailable}
      lockTitle={t('Unlock MCP Server')}
      lockDescription={t(
        'Connect Anticeil to external AI assistants and MCP clients.',
      )}
      featureKey="MCP"
    >
      <div className="flex min-h-full w-full flex-col gap-2">
        <PageHeader title={t('MCP')} />
      <div className="border-b">
        <PageBand>
          <Tabs value={nav.tab} onValueChange={nav.showTab}>
            <TabsList variant="outline">
              <TabsTrigger variant="outline" value="connect">
                {t('Connect')}
              </TabsTrigger>
              <TabsTrigger variant="outline" value="pieces">
                {t('Pieces')}
              </TabsTrigger>
              <TabsTrigger variant="outline" value="connections">
                {t('Connections')}
              </TabsTrigger>
              <TabsTrigger variant="outline" value="activity">
                {t('Activity')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </PageBand>
      </div>
      <div className="w-full">
        {nav.tab === 'pieces' ? (
          <PiecesTab
            projectId={nav.projectId}
            onSelectProject={nav.selectProject}
          />
        ) : nav.tab === 'connections' ? (
          <GrantsTab />
        ) : nav.tab === 'activity' ? (
          <ActivityTab />
        ) : (
          <ConnectTab
            serverUrl={serverUrl}
            isReachableFromInternet={isReachableFromInternet}
          />
        )}
      </div>
    </LockedFeatureGuard>
  );
}
