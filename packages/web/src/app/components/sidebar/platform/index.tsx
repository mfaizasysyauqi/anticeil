import { ApEdition, ApFlagId } from '@activepieces/shared';
import { t } from 'i18next';
import { ChevronRight } from 'lucide-react';
import { ComponentType, useRef } from 'react';
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

  const groups: {
    label: string;
    items: {
      to: string;
      label: string;
      icon?: ComponentType<{ className?: string }>;
      subItems?: { to: string; label: string }[];
    }[];
  }[] = [
    {
      label: t('General'),
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
        },
        {
          to: '/platform/connections',
          label: t('Connections'),
          icon: UnplugIcon,
        },
      ],
    },
    {
      label: t('Setup'),
      items: [
        {
          to: '/platform/setup/general',
          label: t('General'),
          icon: SettingsIcon,
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
        {
          to: '/platform/setup/mcp',
          label: t('MCP Server'),
          icon: McpSvg,
        },
        {
          to: '/platform/setup/pieces',
          label: t('Pieces'),
          icon: PuzzleIcon,
        },
        {
          to: '/platform/setup/templates',
          label: t('Templates'),
          icon: LayoutGridIcon,
        },
      ],
    },
    {
      label: t('Infrastructure'),
      items: [
        {
          to: '/platform/infrastructure/workers',
          label: t('Workers'),
          icon: ServerIcon,
        },
        {
          to: '/platform/infrastructure/health',
          label: t('Health'),
          icon: FileHeartIcon,
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
  ];

  return (
    <Sidebar className="border-r-0!">
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
                      return (
                        <Collapsible
                          key={item.label}
                          defaultOpen={true}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                className={cn('w-full justify-between cursor-pointer')}
                              >
                                <div className="flex items-center gap-2">
                                  {item.icon && (
                                    <item.icon className="size-4 pointer-events-none" />
                                  )}
                                  <span className="text-sm font-normal">
                                    {item.label}
                                  </span>
                                </div>
                                <ChevronRight className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub className="mr-0 pr-0">
                                {item.subItems.map((sub) => {
                                  const isSubActive =
                                    location.pathname === sub.to ||
                                    (sub.to === '/platform/setup/ai/providers' &&
                                      location.pathname === '/platform/setup/ai');
                                  return (
                                    <SidebarMenuSubItem key={sub.to}>
                                      <SidebarMenuSubButton asChild isActive={isSubActive}>
                                        <Link to={sub.to}>
                                          <span>{sub.label}</span>
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


