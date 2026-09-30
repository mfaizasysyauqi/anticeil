import { ApEdition, ApFlagId } from '@activepieces/shared';
import { t } from 'i18next';
import {
  BarChart3,
  ChevronRight,
  CreditCard,
  Crown,
  Hash,
  Key,
  KeyRound,
  LogIn,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ComponentType, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { McpSvg } from '@/assets/img/custom/mcp';
import {
  ChevronLeftIcon,
  ChevronLeftIconHandle,
} from '@/components/icons/chevron-left';
import { FileHeartIcon } from '@/components/icons/file-heart';
import { LayoutGridIcon } from '@/components/icons/layout-grid';
import { MousePointerClickIcon } from '@/components/icons/mouse-pointer-click';
import { PuzzleIcon } from '@/components/icons/puzzle';
import { ServerIcon } from '@/components/icons/server';
import { SettingsIcon } from '@/components/icons/settings';
import { Settings2Icon } from '@/components/icons/settings2';
import { SparklesIcon } from '@/components/icons/sparkles';
import { UnplugIcon } from '@/components/icons/unplug';
import { UsersIcon } from '@/components/icons/users';
import { buttonVariants } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from '@/components/ui/sidebar-shadcn';
import { useAuthorization } from '@/hooks/authorization-hooks';
import { flagsHooks } from '@/hooks/flags-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { determineDefaultRoute } from '@/lib/route-utils';
import { cn } from '@/lib/utils';

import { Sheet, SheetContent } from '@/components/ui/sheet';

import { ApSidebarItem } from '../ap-sidebar-item';
import { SidebarUser } from '../sidebar-user';

export function PlatformSidebar() {
  const { platform } = platformHooks.useCurrentPlatform();
  const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);
  const { checkAccess } = useAuthorization();
  const location = useLocation();
  const defaultRoute = determineDefaultRoute({
    checkAccess,
    chatEnabled: platform.plan.chatEnabled,
  });
  const chevronRef = useRef<ChevronLeftIconHandle>(null);

  type SidebarItemDef = {
    to: string;
    label: string;
    icon?: ComponentType<{ className?: string }>;
    isCrown?: boolean;
    subItems?: { to: string; label: string; isCrown?: boolean }[];
  };

  const groups: {
    label: string;
    items: SidebarItemDef[];
  }[] = [
    {
      label: t('Platform'),
      items: [
        {
          to: '/platform/projects',
          label: t('Projects'),
          icon: LayoutGridIcon,
        },
        {
          to: '/platform/users',
          label: t('Users'),
          icon: UsersIcon,
          subItems: [
            { to: '/platform/users', label: t('Members') },
            {
              to: '/platform/security/project-roles',
              label: t('Project Roles'),
              isCrown: true,
            },
          ],
        },
        {
          to: '/platform/connections',
          label: t('Connections'),
          icon: UnplugIcon,
          subItems: [
            { to: '/platform/connections', label: t('All') },
            {
              to: '/platform/setup/connections',
              label: t('Global Connections'),
              isCrown: true,
            },
          ],
        },
      ],
    },
    {
      label: t('Catalogue'),
      items: [
        {
          to: '/platform/setup/pieces',
          label: t('Pieces'),
          icon: PuzzleIcon,
          subItems: [
            { to: '/platform/setup/pieces', label: t('Pieces') },
            {
              to: '/platform/setup/pieces?tab=piece-sets',
              label: t('Piece Sets'),
              isCrown: true,
            },
          ],
        },
        {
          to: '/platform/setup/templates',
          label: t('Templates'),
          icon: LayoutGridIcon,
          isCrown: true,
        },
        {
          to: '/platform/setup/ai',
          label: t('AI Center'),
          icon: SparklesIcon,
          subItems: [
            { to: '/platform/setup/ai/providers', label: t('Providers') },
            { to: '/platform/setup/ai/capabilities', label: t('Capabilities') },
          ],
        },
      ],
    },
    {
      label: t('Security'),
      items: [
        {
          to: '/platform/security/sso',
          label: t('Single Sign On'),
          icon: LogIn,
          isCrown: true,
        },
        {
          to: '/platform/security/secret-managers',
          label: t('Secret Managers'),
          icon: Key,
          isCrown: true,
        },
        {
          to: '/platform/security/audit-logs',
          label: t('Audit Logs'),
          icon: ShieldCheck,
          isCrown: true,
          subItems: [
            { to: '/platform/security/audit-logs', label: t('Events') },
            {
              to: '/platform/infrastructure/event-destinations',
              label: t('Event Streaming'),
            },
          ],
        },
      ],
    },
    {
      label: t('Developers'),
      items: [
        {
          to: '/platform/security/api-keys',
          label: t('API Keys'),
          icon: KeyRound,
        },
        {
          to: '/platform/security/embed',
          label: t('Embedding'),
          icon: Hash,
          isCrown: true,
        },
        {
          to: '/platform/setup/mcp',
          label: t('MCP Server'),
          icon: McpSvg,
          subItems: [
            { to: '/platform/setup/mcp', label: t('Connection') },
            { to: '/platform/setup/mcp?tab=tools', label: t('Tools') },
            { to: '/platform/setup/mcp?tab=activity', label: t('Activity') },
          ],
        },
      ],
    },
    {
      label: t('Operations'),
      items: [
        {
          to: '/platform/infrastructure/workers',
          label: t('Workers'),
          icon: ServerIcon,
          subItems: [
            { to: '/platform/infrastructure/workers', label: t('Health') },
            {
              to: '/platform/infrastructure/workers?tab=worker-groups',
              label: t('Worker groups'),
              isCrown: true,
            },
          ],
        },
        {
          to: '/platform/infrastructure/health',
          label: t('Health'),
          icon: FileHeartIcon,
          subItems: [
            {
              to: '/platform/infrastructure/health',
              label: t('System Health'),
            },
            {
              to: '/platform/infrastructure/health?tab=runs',
              label: t('Runs Health'),
            },
            {
              to: '/platform/infrastructure/health?tab=queue',
              label: t('Queue Health'),
            },
          ],
        },
        {
          to: '/platform/infrastructure/triggers',
          label: t('Triggers'),
          icon: MousePointerClickIcon,
        },
        ...(edition === ApEdition.CLOUD
          ? []
          : [
              {
                to: '/platform/infrastructure/configurations',
                label: t('Configurations'),
                icon: Settings2Icon,
              },
            ]),
      ],
    },
    {
      label: t('Account'),
      items: [
        {
          to: '/platform/setup/general',
          label: t('General'),
          icon: SettingsIcon,
        },
        {
          to: '/platform/billing',
          label: t('Billing & subscription'),
          icon: CreditCard,
        },
        {
          to: '/platform/usage',
          label: t('Usage'),
          icon: BarChart3,
        },
      ],
    },
  ];

  return (
    <Sidebar collapsible="none" className="border-r-0! w-full h-full bg-sidebar flex flex-col">
      <SidebarHeader className="pb-0">
        <Link
          to={defaultRoute}
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'w-full justify-start gap-2 px-2',
          )}
          onMouseEnter={() => chevronRef.current?.startAnimation()}
          onMouseLeave={() => chevronRef.current?.stopAnimation()}
        >
          <ChevronLeftIcon ref={chevronRef} className="size-4" size={16} />
          <span className="truncate text-sm">{t('Back to app')}</span>
        </Link>
      </SidebarHeader>
      <div className="flex-1 overflow-y-auto">
        <SidebarContent className="gap-0">
          {groups.map((group, idx) => (
            <SidebarGroup key={group.label} className="cursor-default shrink-0">
              {idx > 0 && <SidebarSeparator className="mb-3" />}
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    if (item.subItems) {
                      const isAnySubActive = item.subItems.some((sub) => {
                        const basePath = sub.to.split('?')[0];
                        return (
                          location.pathname === basePath ||
                          location.pathname.startsWith(basePath + '/')
                        );
                      });
                      return (
                        <Collapsible
                          key={item.label}
                          defaultOpen={true}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                className={cn(
                                   'w-full justify-between cursor-pointer',
                                   isAnySubActive && 'font-medium',
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {item.icon && (
                                    <item.icon className="size-4 pointer-events-none shrink-0" />
                                  )}
                                  <span className="text-sm font-normal truncate">
                                    {item.label}
                                  </span>
                                  {item.isCrown && (
                                    <Crown className="size-3.5 shrink-0 text-foreground opacity-80 ml-0.5" />
                                  )}
                                </div>
                                <ChevronRight className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 shrink-0" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub className="mr-0 pr-0 ml-[15px] pl-3.5 border-l-2 border-border gap-1 my-1">
                                {item.subItems.map((sub, sIdx) => {
                                  const currentFull =
                                    location.pathname + location.search;
                                  const isSubActive = sub.to.includes('?')
                                    ? currentFull === sub.to
                                    : (location.pathname === sub.to &&
                                        !location.search) ||
                                      (sub.to ===
                                        '/platform/setup/ai/providers' &&
                                        (location.pathname ===
                                          '/platform/setup/ai' ||
                                          location.pathname ===
                                            '/platform/setup/ai/providers')) ||
                                      (sub.to ===
                                        '/platform/setup/ai/capabilities' &&
                                        (location.pathname ===
                                          '/platform/setup/ai-capabilities' ||
                                          location.pathname ===
                                            '/platform/setup/ai/capabilities'));
                                  return (
                                    <SidebarMenuSubItem key={`${sub.to}-${sIdx}`}>
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={isSubActive}
                                        className={cn(
                                          'cursor-pointer transition-colors text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md px-2.5 py-1.5 h-8 w-full',
                                          isSubActive &&
                                            'bg-sidebar-accent! text-sidebar-accent-foreground! font-medium',
                                        )}
                                      >
                                        <Link
                                          to={sub.to}
                                          className="flex items-center justify-between w-full"
                                        >
                                          <span className="truncate">
                                            {sub.label}
                                          </span>
                                          {sub.isCrown && (
                                            <Crown className="size-3.5 shrink-0 text-foreground opacity-80 ml-auto" />
                                          )}
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  );
                                })}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      );
                    }
                    return (
                      <ApSidebarItem
                        type="link"
                        key={item.label}
                        to={item.to}
                        label={item.label}
                        icon={item.icon}
                        isCrown={item.isCrown}
                      />
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </div>

      <SidebarFooter className="pb-3">
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}

export function MobilePlatformSidebarSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        hideCloseButton
        className="w-72 max-w-[85vw] p-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full overflow-hidden"
      >
        <div 
          className="flex h-full w-full flex-col overflow-y-auto"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('a') || target.closest('button')) {
              onOpenChange(false);
            }
          }}
        >
          <PlatformSidebar />
        </div>
      </SheetContent>
    </Sheet>
  );
}

