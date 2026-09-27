import { isNil } from '@activepieces/core-utils';
import { ApEdition, ApFlagId } from '@activepieces/shared';
import { Menu, Search, Unplug } from 'lucide-react';
import React, { ComponentType, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { UserAvatar } from '@/components/custom/user-avatar';
import { BotIcon } from '@/components/icons/bot';
import { ChartLineIcon } from '@/components/icons/chart-line';
import { CompassIcon } from '@/components/icons/compass';
import { useEmbedding } from '@/components/providers/embed-provider';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar-shadcn';
import { ManagePlanDialog } from '@/features/billing';
import { projectHooks } from '@/features/projects';
import { flagsHooks } from '@/hooks/flags-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { cn } from '@/lib/utils';

import { authenticationSession } from '../../../lib/authentication-session';
import {
  GlobalSearchProvider,
  useGlobalSearch,
} from '../global-search/global-search-context';
import { MobilePrimaryRailSheet, PrimaryRail } from '../primary-rail';

import { ProjectDashboardLayoutHeader } from './project-dashboard-layout-header';

export type ProjectDashboardLayoutHeaderTab = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  hasPermission: boolean;
  show: boolean;
  beta?: boolean;
  badgeCount?: number;
};

const ProjectChangedRedirector = ({
  currentProjectId,
  children,
}: {
  currentProjectId: string;
  children: React.ReactNode;
}) => {
  projectHooks.useReloadPageIfProjectIdChanged(currentProjectId);
  return children;
};

export function ProjectDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);
  const currentProjectId = authenticationSession.getProjectId();
  const { t } = useTranslation();
  const location = useLocation();
  const isPlatformPage = location.pathname.includes('/platform/');
  const isEmbedded = useEmbedding().embedState.isEmbedded;
  const hasNoProject = isNil(currentProjectId) || currentProjectId === '';

  const itemsWithoutHeader: ProjectDashboardLayoutHeaderTab[] = [
    {
      to: '/templates',
      label: t('Explore'),
      show: !isEmbedded,
      icon: CompassIcon,
      hasPermission: true,
    },
    {
      to: '/impact',
      label: t('Impact'),
      show: !isEmbedded,
      icon: ChartLineIcon,
      hasPermission: true,
    },
    {
      to: '/chat',
      label: t('Chat'),
      show: !isEmbedded,
      icon: CompassIcon,
      hasPermission: true,
    },
    {
      to: '/agents',
      label: t('Agents'),
      show: !isEmbedded,
      icon: BotIcon,
      hasPermission: true,
    },
    {
      to: '/mcp-server',
      label: t('MCP'),
      show: !isEmbedded,
      icon: Unplug,
      hasPermission: true,
    },
  ];

  const hideHeader =
    hasNoProject ||
    itemsWithoutHeader.some((item) => location.pathname.includes(item.to)) ||
    isPlatformPage;

  const inner = (
    <GlobalSearchProvider>
      <ProjectDashboardLayoutInner
        hideHeader={hideHeader}
        isEmbedded={isEmbedded}
        currentProjectId={currentProjectId ?? ''}
      >
        {children}
      </ProjectDashboardLayoutInner>
      {edition !== ApEdition.COMMUNITY && <ManagePlanDialog />}
    </GlobalSearchProvider>
  );

  if (hasNoProject) {
    return inner;
  }

  return (
    <ProjectChangedRedirector currentProjectId={currentProjectId!}>
      {inner}
    </ProjectChangedRedirector>
  );
}

function ProjectDashboardLayoutInner({
  hideHeader,
  isEmbedded,
  currentProjectId,
  children,
}: {
  hideHeader: boolean;
  isEmbedded: boolean;
  currentProjectId: string;
  children: React.ReactNode;
}) {
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const branding = flagsHooks.useWebsiteBranding();
  const { data: currentUser } = userHooks.useCurrentUser();

  return (
    <div className="flex flex-col lg:flex-row h-svh w-full overflow-hidden">
      {!isEmbedded && (
        <>
          <PrimaryRail />
          <MobilePrimaryRailSheet
            open={mobileNavOpen}
            onOpenChange={setMobileNavOpen}
          />
        </>
      )}

      {/* Mobile / Tablet Top Navigation Bar (screens < 1024px) */}
      {!isEmbedded && (
        <header className="sticky top-0 z-30 flex lg:hidden items-center justify-between h-13 px-3 bg-sidebar border-b border-sidebar-border shrink-0 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Toggle navigation menu"
              className="size-9 shrink-0 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer"
            >
              <Menu className="size-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={branding.logos.logoIconUrl}
                alt={branding.websiteName}
                className="size-5 shrink-0"
                draggable={false}
              />
              <span className="font-semibold text-sm truncate max-w-[150px] sm:max-w-[220px]">
                {branding.websiteName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="size-8 rounded-full text-sidebar-foreground/80 hover:bg-sidebar-accent cursor-pointer"
            >
              <Search className="size-4" />
            </Button>
          </div>
        </header>
      )}

      <SidebarProvider
        defaultOpen={false}
        hoverMode={!searchOpen}
        className="flex-1 min-w-0 w-full h-full min-h-0 will-change-transform"
      >
        <SidebarInset className="flex flex-col h-full flex-1 min-h-0 overflow-hidden bg-sidebar">
          <div
            className={cn(
              'flex-1 flex flex-col min-h-0 overflow-hidden',
              !isEmbedded && 'p-0 sm:pr-2 sm:pt-2 sm:pb-2 lg:pr-2 lg:pt-3 lg:pb-3',
            )}
          >
            <div
              id="dashboard-content-container"
              className={cn(
                'relative flex flex-col h-full flex-1 min-h-0 bg-background overflow-clip',
                !isEmbedded &&
                  'rounded-none sm:rounded-xl shadow-[2px_0px_4px_-2px_rgba(0,0,0,0.05),0px_2px_4px_-2px_rgba(0,0,0,0.05)] border-0 sm:border',
              )}
            >
              {!hideHeader && (
                <ProjectDashboardLayoutHeader key={currentProjectId} />
              )}
              <div className="flex-1 min-h-0 overflow-auto">{children}</div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

