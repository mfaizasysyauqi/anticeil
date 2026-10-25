import { Permission } from '@activepieces/core-utils';
import {
  ApEdition,
  ApFlagId,
  isNil,
  PlatformRole,
  PROJECT_COLOR_PALETTE,
  ProjectType,
  ProjectWithLimits,
  TemplateTelemetryEventType,
} from '@activepieces/shared';
import { useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import {
  Bot,
  ChartLine,
  ChevronsUpDown,
  Compass,
  Lock,
  LogOut,
  MessagesSquare,
  PanelLeftClose,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  SquarePen,
  Unplug,
  UserCogIcon,
  Workflow,
  Plus,
  Sparkles,
  Terminal,
  Layers,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { ComponentType, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CommunityHub, loadStoredHubs } from '@/lib/community-hubs';

import { UserAvatar } from '@/components/custom/user-avatar';
import { useEmbedding } from '@/components/providers/embed-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAgentsNavVisible } from '@/features/agents';
import { chatUtils } from '@/features/chat/lib/chat-utils';
import {
  CreateProjectButton,
  getProjectName,
  PlatformSwitcher,
  projectCollectionUtils,
} from '@/features/projects';
import { templatesTelemetryApi } from '@/features/templates';
import {
  railIsCollapsed,
  useRailCollapsed,
} from '@/features/workspace/lib/rail-collapsed';
import {
  useAuthorization,
  useIsPlatformAdmin,
} from '@/hooks/authorization-hooks';
import { flagsHooks } from '@/hooks/flags-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { cn } from '@/lib/utils';

import { AccountSettingsDialog } from '../account-settings';
import { recordAccess } from '../global-search/access-history';
import { useGlobalSearch } from '../global-search/global-search-context';
import { HelpAndFeedback } from '../help-and-feedback';
import { MCP_CLIENT_BRANDING } from '../../routes/mcp-server/mcp-client-display';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarUsageLimits } from '@/features/billing/components/sidebar-usage-limits';

function renderHubIcon(hub: CommunityHub) {
  switch (hub.iconType) {
    case 'logo':
      return (
        <img
          src="/logo.png"
          alt="Anticeil"
          className="size-5 object-contain pointer-events-none drop-shadow-xs"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/favicon.ico';
          }}
        />
      );
    case 'spark':
      return <Sparkles className="w-4 h-4 text-amber-400" />;
    case 'bot':
      return <Bot className="w-4 h-4 text-emerald-400" />;
    case 'templates':
      return <Layers className="w-4 h-4 text-purple-400" />;
    case 'code':
      return <Terminal className="w-4 h-4 text-blue-400" />;
    case 'dm':
      return <MessagesSquare className="w-4 h-4 text-rose-400" />;
    default:
      return <span className="font-bold text-xs">{hub.initials}</span>;
  }
}

function getIsPlusOrAbove(platform: any): boolean {
  const planName = (platform?.plan?.plan || 'free').toLowerCase();
  const isTeamOrEnterprise = planName.includes('team') || planName.includes('enterprise');
  return planName.includes('plus') || isTeamOrEnterprise;
}

export function PrimaryRail() {
  const { embedState } = useEmbedding();
  const { platform } = platformHooks.useCurrentPlatform();
  const isPlusOrAbove = getIsPlusOrAbove(platform);
  const { data: currentUser } = userHooks.useCurrentUser();
  const { preference, setCollapsed, toggle } = useRailCollapsed();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const collapsed = railIsCollapsed({ preference, pathname, openedOn });
  const showAgents = useAgentsNavVisible();
  const { checkAccess } = useAuthorization();
  const isPlatformAdmin = useIsPlatformAdmin();
  const [hovered, setHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMenuOpenRef = useRef(false);
  const isMouseInsideRef = useRef(false);

  // Unified Mini Rail: Detect whether we are in Chat mode or Automation mode
  const isChatMode = pathname.startsWith('/community') || pathname.startsWith('/messages');

  // Hubs state for Chat mode
  const [hubs, setHubs] = useState<CommunityHub[]>(() => loadStoredHubs());
  const [activeHubId, setActiveHubId] = useState<string>(() => {
    return new URLSearchParams(window.location.search).get('hub') || 'anticeil';
  });

  useEffect(() => {
    const handleHubChange = (e: any) => {
      if (e.detail) setActiveHubId(e.detail);
    };
    const handleHubsChanged = () => {
      setHubs(loadStoredHubs());
    };
    window.addEventListener('anticeil_active_hub_changed', handleHubChange as EventListener);
    window.addEventListener('anticeil_hubs_changed', handleHubsChanged);
    return () => {
      window.removeEventListener('anticeil_active_hub_changed', handleHubChange as EventListener);
      window.removeEventListener('anticeil_hubs_changed', handleHubsChanged);
    };
  }, []);

  useEffect(() => {
    const hubParam = new URLSearchParams(search).get('hub');
    if (hubParam && hubParam !== activeHubId) {
      setActiveHubId(hubParam);
    }
  }, [search]);

  const handleSelectHub = (hubId: string) => {
    setActiveHubId(hubId);
    navigate(`/messages?hub=${hubId}`);
    window.dispatchEvent(new CustomEvent('anticeil_switch_hub', { detail: hubId }));
  };

  const handleOpenCreateHub = () => {
    window.dispatchEvent(new CustomEvent('anticeil_open_create_hub'));
  };

  const handleMouseEnter = useCallback(() => {
    isMouseInsideRef.current = true;
    if (!collapsed) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHovered(true), 200);
  }, [collapsed]);

  const handleMouseLeave = useCallback(() => {
    isMouseInsideRef.current = false;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
    if (!isMenuOpenRef.current) {
      setHovered(false);
    }
  }, []);

  const handleMenuOpenChange = useCallback((open: boolean) => {
    isMenuOpenRef.current = open;
    setIsMenuOpen(open);
    if (!open && !isMouseInsideRef.current) {
      setHovered(false);
    }
  }, []);

  if (embedState.isEmbedded || embedState.hideSideNav) {
    return null;
  }

  const openSidebar = () => {
    setOpenedOn(pathname);
    setCollapsed(false);
  };
  const toggleCollapsed = () => {
    setOpenedOn(pathname);
    toggle();
  };

  // Zapier-style: when collapsed, show the overlay on hover OR while dropdown menu is open (only in Automation mode)
  const showOverlay = !isChatMode && collapsed && (hovered || isMenuOpen);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="relative hidden lg:block shrink-0"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
      {/* Always render the collapsed rail to hold space */}
      <aside
        onClick={!isChatMode && collapsed ? openSidebar : undefined}
        title={!isChatMode && collapsed ? t('Open sidebar') : undefined}
        className={cn(
          'hidden lg:flex h-svh shrink-0 flex-col overflow-hidden whitespace-nowrap bg-sidebar pt-[10px] pb-3 transition-[width] duration-200 ease-out motion-reduce:transition-none',
          isChatMode ? 'w-14 items-center select-none' : collapsed ? 'w-14 cursor-ew-resize items-center' : 'w-62',
        )}
      >
        {isChatMode ? (
          /* ── CHAT MODE: REPLACED WITH DISCORD SERVER & DMS RAIL ── */
          <>
            {/* 1. Top: Anticeil Logo / Direct Messages (Home Hub) - Exactly h-12 to align with App Bar */}
            {hubs[0] && (
              <div className="relative group w-full h-12 flex items-center justify-center shrink-0">
                <span
                  className={cn(
                    'absolute left-0 w-[3px] bg-foreground rounded-r-full transition-all duration-200',
                    activeHubId === 'anticeil'
                      ? 'h-6'
                      : 'h-0 group-hover:h-3.5 opacity-80',
                  )}
                />
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleSelectHub('anticeil')}
                      className={cn(
                        'relative size-10 flex items-center justify-center font-bold text-xs transition-all duration-200 cursor-pointer shrink-0',
                        activeHubId === 'anticeil'
                          ? 'rounded-[12px] bg-primary/20 text-primary border border-primary/40 shadow-xs shadow-primary/10'
                          : 'rounded-full bg-sidebar-accent text-sidebar-foreground hover:rounded-[12px] hover:bg-sidebar-accent/80',
                      )}
                    >
                      {renderHubIcon(hubs[0])}
                      {hubs[0].unreadCount && hubs[0].unreadCount > 0 ? (
                        <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center border-2 border-sidebar">
                          {hubs[0].unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10} className="font-semibold text-xs">
                    {hubs[0].name}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Separator bar - Perfectly aligned with the bottom border of the h-12 App Bar */}
            <div className="w-full flex items-center justify-center h-0 relative shrink-0 z-20">
              <div className="w-6 h-[2px] bg-sidebar-border rounded-full" />
            </div>

            {/* 2. Mode Switcher: Automation Icon (dibawah logo Anticeil) */}
            <div className="flex flex-col items-center shrink-0 px-2 pt-2">
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <Link
                    to="/"
                    className="group relative size-10 rounded-full bg-sidebar-accent text-muted-foreground hover:rounded-[12px] hover:bg-primary/15 hover:text-primary flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs"
                  >
                    <Workflow className="size-5 transition-transform group-hover:scale-110" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="font-semibold text-xs">
                  {t('Mode Otomasi (Flows & Integrasi)')}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Separator bar */}
            <div className="w-6 h-[2px] bg-sidebar-border rounded-full my-1.5 shrink-0" />

            {/* 3. Scrollable Hubs / Servers List */}
            <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col items-center gap-2 py-1 pb-16">

              {/* Other Servers */}
              {hubs.slice(1).map((hub) => {
                const isActive = activeHubId === hub.id;
                return (
                  <div key={hub.id} className="relative group w-full flex items-center justify-center">
                    <span
                      className={cn(
                        'absolute left-0 w-[3px] bg-foreground rounded-r-full transition-all duration-200',
                        isActive ? 'h-6' : 'h-0 group-hover:h-3.5 opacity-80',
                      )}
                    />
                    <Tooltip delayDuration={150}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleSelectHub(hub.id)}
                          className={cn(
                            'relative size-9 flex items-center justify-center font-bold text-xs transition-all duration-200 cursor-pointer shrink-0',
                            isActive
                              ? 'rounded-[12px] bg-primary/20 text-primary border border-primary/40 shadow-xs shadow-primary/10'
                              : 'rounded-full bg-sidebar-accent text-sidebar-foreground hover:rounded-[12px] hover:bg-sidebar-accent/80',
                          )}
                        >
                          {renderHubIcon(hub)}
                          {hub.unreadCount && hub.unreadCount > 0 ? (
                            <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center border-2 border-sidebar">
                              {hub.unreadCount}
                            </span>
                          ) : null}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10} className="font-semibold text-xs">
                        {hub.name}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}

              {/* Add Server (+) Button */}
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleOpenCreateHub}
                    className="group relative size-9 rounded-full bg-sidebar-accent text-emerald-500 hover:rounded-[12px] hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="font-semibold text-xs">
                  {t('Buat Server Baru')}
                </TooltipContent>
              </Tooltip>

              {/* Discover / Templates Compass */}
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <Link
                    to="/templates"
                    className="group relative size-9 rounded-full bg-sidebar-accent text-muted-foreground hover:rounded-[12px] hover:bg-primary hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0"
                  >
                    <Compass className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="font-semibold text-xs">
                  {t('Jelajahi Template Otomasi')}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* 3. Bottom: spacer to push list to top */}
            <div className="shrink-0 h-2" />
          </>
        ) : (
          /* ── AUTOMATION MODE: STANDARD PRIMARY RAIL ── */
          <>
            <RailHeader collapsed={collapsed} onToggle={toggleCollapsed} />

            <div
              className={cn(
                'mt-2 flex min-h-0 flex-1 flex-col',
                collapsed ? 'items-center px-2' : 'px-2',
              )}
            >
              <div
                className={cn(
                  'flex shrink-0 flex-col gap-1',
                  collapsed && 'items-center',
                )}
              >
                <RailNavButton
                  collapsed={collapsed}
                  to="/messages"
                  icon={MessagesSquare}
                  label={t('Chat')}
                  isActive={({ pathname }) =>
                    pathname.startsWith('/community') || pathname.startsWith('/messages')
                  }
                />
              </div>

              <div
                className={cn(
                  'my-1.5 h-px shrink-0 bg-sidebar-border',
                  collapsed ? 'w-6' : 'mx-1',
                )}
              />

              <div
                className={cn(
                  'flex shrink-0 flex-col gap-1',
                  collapsed && 'items-center',
                )}
              >
                {(platform?.plan?.chatEnabled ?? true) && (
                  <RailNavButton
                    collapsed={collapsed}
                    to="/chat"
                    icon={SquarePen}
                    label={t('Chatbot')}
                    isActive={({ pathname }) => pathname.startsWith('/chat')}
                    onClick={() =>
                      window.dispatchEvent(new Event(chatUtils.newChatEvent))
                    }
                  />
                )}
                {checkAccess(Permission.READ_MCP) && (
                  <RailNavButton
                    collapsed={collapsed}
                    to="/mcp-server"
                    icon={Unplug}
                    label={t('MCP')}
                    badge={<McpClientLogos />}
                    isActive={({ pathname }) => pathname.startsWith('/mcp-server')}
                  />
                )}
              </div>

              {((platform?.plan?.chatEnabled ?? true) || checkAccess(Permission.READ_MCP)) && (
                <div
                  className={cn(
                    'my-1.5 h-px shrink-0 bg-sidebar-border',
                    collapsed ? 'w-6' : 'mx-1',
                  )}
                />
              )}

              <div
                className={cn(
                  'flex shrink-0 flex-col gap-1',
                  collapsed && 'items-center',
                )}
              >
                <RailNavButton
                  collapsed={collapsed}
                  to="/agents"
                  icon={Bot}
                  label={t('Agents')}
                  isActive={({ pathname }) => pathname.startsWith('/agents')}
                />
                <RailNavButton
                  collapsed={collapsed}
                  to="/templates"
                  icon={Compass}
                  label={t('Explore')}
                  isActive={({ pathname }) => pathname.startsWith('/templates')}
                  onClick={() =>
                    templatesTelemetryApi.sendEvent({
                      eventType: TemplateTelemetryEventType.EXPLORE_VIEW,
                      userId: currentUser?.id,
                    })
                  }
                />
                <RailNavButton
                  collapsed={collapsed}
                  to="/impact"
                  icon={ChartLine}
                  label={t('Impact')}
                  isActive={({ pathname }) => pathname.startsWith('/impact')}
                />
              </div>

              {authenticationSession.isLoggedIn() && (
                <>
                  <div
                    className={cn(
                      'my-1.5 h-px shrink-0 bg-sidebar-border',
                      collapsed ? 'w-6' : 'mx-1',
                    )}
                  />
                  <RailPinnedProjects collapsed={collapsed} />
                </>
              )}
            </div>

            <div className="mt-auto flex flex-col gap-1.5 w-full">
              {!collapsed && authenticationSession.isLoggedIn() && (
                <div className="px-2">
                  <SidebarUsageLimits />
                </div>
              )}
              <RailAccountRow collapsed={collapsed} onMenuOpenChange={handleMenuOpenChange} />
            </div>
          </>
        )}
      </aside>

      {/* Hover overlay — expanded sidebar floating on top when collapsed */}
      {showOverlay && (
        <aside
          className="absolute left-0 top-0 z-50 flex h-svh w-62 flex-col overflow-hidden whitespace-nowrap bg-sidebar py-3 shadow-xl border-r border-sidebar-border animate-in slide-in-from-left-2 duration-150"
        >
          <RailHeader collapsed={false} onToggle={toggleCollapsed} />

          <div className="mt-2 flex min-h-0 flex-1 flex-col px-2">
            <div className="flex shrink-0 flex-col gap-1">
              <RailNavButton
                collapsed={false}
                to="/messages"
                icon={MessagesSquare}
                label={t('Chat')}
                isActive={({ pathname }) =>
                  pathname.startsWith('/community') || pathname.startsWith('/messages')
                }
                onClick={() => setHovered(false)}
              />
            </div>

            <div className="my-1.5 mx-1 h-px shrink-0 bg-sidebar-border" />

            <div className="flex shrink-0 flex-col gap-1">
              {(platform?.plan?.chatEnabled ?? true) && (
                <RailNavButton
                  collapsed={false}
                  to="/chat"
                  icon={SquarePen}
                  label={t('Chatbot')}
                  isActive={({ pathname }) => pathname.startsWith('/chat')}
                  onClick={() => {
                    setHovered(false);
                    window.dispatchEvent(new Event(chatUtils.newChatEvent));
                  }}
                />
              )}
              {checkAccess(Permission.READ_MCP) && (
                <RailNavButton
                  collapsed={false}
                  to="/mcp-server"
                  icon={Unplug}
                  label={t('MCP')}
                  badge={<McpClientLogos />}
                  isActive={({ pathname }) => pathname.startsWith('/mcp-server')}
                  onClick={() => setHovered(false)}
                />
              )}
            </div>

            {((platform?.plan?.chatEnabled ?? true) || checkAccess(Permission.READ_MCP)) && (
              <div className="my-1.5 mx-1 h-px shrink-0 bg-sidebar-border" />
            )}

            <div className="flex shrink-0 flex-col gap-1">
              <RailNavButton
                collapsed={false}
                to="/agents"
                icon={Bot}
                label={t('Agents')}
                isActive={({ pathname }) => pathname.startsWith('/agents')}
                onClick={() => setHovered(false)}
              />
              <RailNavButton
                collapsed={false}
                to="/templates"
                icon={Compass}
                label={t('Explore')}
                isActive={({ pathname }) => pathname.startsWith('/templates')}
                onClick={() => {
                  setHovered(false);
                  templatesTelemetryApi.sendEvent({
                    eventType: TemplateTelemetryEventType.EXPLORE_VIEW,
                    userId: currentUser?.id,
                  });
                }}
              />
              <RailNavButton
                collapsed={false}
                to="/impact"
                icon={ChartLine}
                label={t('Impact')}
                isActive={({ pathname }) => pathname.startsWith('/impact')}
                onClick={() => setHovered(false)}
              />
            </div>

            {authenticationSession.isLoggedIn() && (
              <>
                <div className="my-1.5 mx-1 h-px shrink-0 bg-sidebar-border" />
                <RailPinnedProjects collapsed={false} />
              </>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-1.5 w-full">
            {authenticationSession.isLoggedIn() && (
              <div className="px-2">
                <SidebarUsageLimits />
              </div>
            )}
            <RailAccountRow collapsed={false} onMenuOpenChange={handleMenuOpenChange} />
          </div>
        </aside>
      )}
      </div>
    </TooltipProvider>
  );
}

export function MobilePrimaryRailSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { embedState } = useEmbedding();
  const { platform } = platformHooks.useCurrentPlatform();
  const isPlusOrAbove = getIsPlusOrAbove(platform);
  const { data: currentUser } = userHooks.useCurrentUser();
  const showAgents = useAgentsNavVisible();
  const { checkAccess } = useAuthorization();
  const isPlatformAdmin = useIsPlatformAdmin();

  if (embedState.isEmbedded || embedState.hideSideNav) {
    return null;
  }

  const handleNavigate = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        hideCloseButton
        className="w-72 max-w-[85vw] p-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full overflow-hidden"
      >
        <div className="flex h-full w-full flex-col overflow-y-auto py-3">
          <RailHeader collapsed={false} onToggle={() => onOpenChange(false)} />

          <div className="mt-2 flex min-h-0 flex-1 flex-col px-2">
            <div className="flex shrink-0 flex-col gap-1">
              <RailNavButton
                collapsed={false}
                to="/messages"
                icon={MessagesSquare}
                label={t('Chat')}
                isActive={({ pathname }) =>
                  pathname.startsWith('/community') || pathname.startsWith('/messages')
                }
                onClick={handleNavigate}
              />
            </div>

            <div className="my-1.5 mx-1 h-px shrink-0 bg-sidebar-border" />

            <div className="flex shrink-0 flex-col gap-1">
              {(platform?.plan?.chatEnabled ?? true) && (
                <RailNavButton
                  collapsed={false}
                  to="/chat"
                  icon={SquarePen}
                  label={t('Chatbot')}
                  isActive={({ pathname }) => pathname.startsWith('/chat')}
                  onClick={() => {
                    handleNavigate();
                    window.dispatchEvent(new Event(chatUtils.newChatEvent));
                  }}
                />
              )}
              {checkAccess(Permission.READ_MCP) && (
                <RailNavButton
                  collapsed={false}
                  to="/mcp-server"
                  icon={Unplug}
                  label={t('MCP')}
                  badge={<McpClientLogos />}
                  isActive={({ pathname }) => pathname.startsWith('/mcp-server')}
                  onClick={handleNavigate}
                />
              )}
            </div>

            {((platform?.plan?.chatEnabled ?? true) || checkAccess(Permission.READ_MCP)) && (
              <div className="my-1.5 mx-1 h-px shrink-0 bg-sidebar-border" />
            )}

            <div className="flex shrink-0 flex-col gap-1">
              <RailNavButton
                collapsed={false}
                to="/agents"
                icon={Bot}
                label={t('Agents')}
                isActive={({ pathname }) => pathname.startsWith('/agents')}
                onClick={handleNavigate}
              />
              <RailNavButton
                collapsed={false}
                to="/templates"
                icon={Compass}
                label={t('Explore')}
                isActive={({ pathname }) => pathname.startsWith('/templates')}
                onClick={() => {
                  handleNavigate();
                  templatesTelemetryApi.sendEvent({
                    eventType: TemplateTelemetryEventType.EXPLORE_VIEW,
                    userId: currentUser?.id,
                  });
                }}
              />
              <RailNavButton
                collapsed={false}
                to="/impact"
                icon={ChartLine}
                label={t('Impact')}
                isActive={({ pathname }) => pathname.startsWith('/impact')}
                onClick={handleNavigate}
              />
            </div>

            {authenticationSession.isLoggedIn() && (
              <>
                <div className="my-1.5 mx-1 h-px shrink-0 bg-sidebar-border" />
                <RailPinnedProjects collapsed={false} />
              </>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-1.5 w-full">
            <div className="px-2">
              <SidebarUsageLimits />
            </div>
            <RailAccountRow collapsed={false} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


function RailHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const branding = flagsHooks.useWebsiteBranding();
  const { setOpen: setSearchOpen } = useGlobalSearch();
  const { embedState } = useEmbedding();
  const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);
  const { platform: currentPlatform } = platformHooks.useCurrentPlatform();
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = authenticationSession.isLoggedIn();
  const showSwitcher = !embedState.isEmbedded && isLoggedIn;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 px-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggle}
              aria-label={t('Open sidebar')}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-sidebar-accent"
            >
              <img
                src={branding.logos.logoIconUrl || '/logo.png'}
                alt={branding.websiteName}
                className="size-5 shrink-0 object-contain"
                draggable={false}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.svg';
                }}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t('Open sidebar')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchOpen(true);
              }}
              aria-label={t('Search')}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Search className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t('Search')}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/"
            className="flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-sidebar-accent"
          >
            <img
              src={branding.logos.logoIconUrl || '/logo.png'}
              alt={branding.websiteName}
              className="size-5 shrink-0 object-contain"
              draggable={false}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.svg';
              }}
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{branding.websiteName}</TooltipContent>
      </Tooltip>

      {!isLoggedIn ? (
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              const searchParams = new URLSearchParams(location.search);
              searchParams.set('login', 'true');
              navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
            }}
            title={t('Click to sign in')}
            className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-sidebar-accent cursor-pointer group"
          >
            <span className="flex-1 truncate text-sm font-medium text-sidebar-foreground/80 group-hover:text-sidebar-foreground">
              {t('Guest')}
            </span>
          </button>
        </div>
      ) : showSwitcher ? (
        <div className="min-w-0 flex-1">
          <PlatformSwitcher>
            <button
              type="button"
              className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-sidebar-accent cursor-pointer"
            >
              <span className="flex-1 truncate text-sm font-medium">
                {currentPlatform?.name ?? t('platform')}
              </span>
              <ChevronsUpDown className="ml-auto size-3 shrink-0" />
            </button>
          </PlatformSwitcher>
        </div>
      ) : (
        <h1 className="min-w-0 flex-1 truncate text-sm font-medium">
          {branding.websiteName}
        </h1>
      )}

      <div className="flex shrink-0 items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={() => setSearchOpen(true)}
              aria-label={t('Search')}
            >
              <Search className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{t('Search')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={onToggle}
              aria-label={t('Close sidebar')}
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{t('Close sidebar')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}


const MCP_SIDEBAR_CLIENTS = ['claude', 'chatgpt', 'cursor'] as const;

function McpClientLogos() {
  return (
    <span aria-hidden className="ml-auto flex shrink-0 items-center gap-1">
      {MCP_SIDEBAR_CLIENTS.map((client) => (
        <span
          key={client}
          className="flex size-[18px] shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-sidebar-border bg-sidebar-accent/50 p-[1.5px]"
        >
          <img
            src={MCP_CLIENT_BRANDING[client].icon}
            alt=""
            className={cn(
              'size-3.5 object-contain',
              client === 'chatgpt' && 'dark:invert',
            )}
          />
        </span>
      ))}
    </span>
  );
}

function RailNavButton({
  collapsed,
  to,
  icon: Icon,
  label,
  badge,
  isActive,
  onClick,
}: {
  collapsed: boolean;
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  badge?: React.ReactNode;
  isActive: (location: { pathname: string; search: string }) => boolean;
  onClick?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = isActive(location);
  const isLoggedIn = authenticationSession.isLoggedIn();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn && to !== '/templates') {
      e.preventDefault();
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('login', 'true');
      searchParams.set('from', to);
      navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
      return;
    }
    onClick?.();
  };

  const link = (
    <Link
      to={to}
      aria-label={label}
      onClick={handleClick}
      className={cn(
        'flex shrink-0 items-center gap-3 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors',
        collapsed ? 'size-9 cursor-pointer justify-center' : 'h-10 px-3',
        active && 'bg-sidebar-accent font-medium text-sidebar-foreground',
      )}
    >
      <Icon className={cn('size-[18px] shrink-0', active && 'text-primary')} />
      {!collapsed && <span className="truncate flex-1">{label}</span>}
      {!collapsed && badge}
    </Link>
  );


  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function RailPinnedProjects({ collapsed }: { collapsed: boolean }) {
  if (!authenticationSession.isLoggedIn()) {
    return null;
  }
  return <RailPinnedProjectsInner collapsed={collapsed} />;
}

function RailPinnedProjectsInner({ collapsed }: { collapsed: boolean }) {
  const { data: projects } = projectCollectionUtils.useAll();
  const { platform } = platformHooks.useCurrentPlatform();
  const { data: currentUser } = userHooks.useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
  const showCreateProject = currentUser?.platformRole === PlatformRole.ADMIN;
  const [sort, setSort] = useState<PinnedSort>(() =>
    readStoredSort(localStorage.getItem(PINNED_SORT_KEY)),
  );

  const changeSort = (next: PinnedSort) => {
    setSort(next);
    localStorage.setItem(PINNED_SORT_KEY, next);
  };

  if (projects.length === 0) {
    return null;
  }

  const ordered = orderProjects({
    projects,
    sort,
  });

  const openProject = ({
    projectId,
    name,
  }: {
    projectId: string;
    name: string;
  }) => {
    recordAccess({
      id: `project-${projectId}`,
      type: 'project',
      label: name,
      href: `/projects/${projectId}/automations`,
    });
    if (projectId !== authenticationSession.getProjectId()) {
      authenticationSession.switchToProject(projectId);
    }
    navigate(`/projects/${projectId}/automations`);
  };

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col',
        collapsed && 'items-center',
      )}
    >
      {!collapsed && (
        <div className="flex shrink-0 items-center gap-1 py-1 pl-3 pr-1">
          <span className="flex-1 truncate text-xs font-medium text-sidebar-foreground/70">
            {t('Projects')}
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            {showCreateProject && (
              <CreateProjectButton
                variant="icon"
                projects={projects ?? []}
                className={RAIL_HEADER_ICON_BUTTON}
                onCreate={(project) => {
                  navigate(`/projects/${project.id}/automations`);
                }}
              />
            )}
            <PinnedSortMenu sort={sort} onChange={changeSort} />
          </div>
        </div>
      )}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto',
          collapsed && 'items-center',
        )}
      >
        {ordered.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            collapsed={collapsed}
            active={location.pathname.includes(`/projects/${project.id}`)}
            onOpen={openProject}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  collapsed,
  active,
  onOpen,
}: {
  project: ProjectWithLimits;
  collapsed: boolean;
  active: boolean;
  onOpen: (params: { projectId: string; name: string }) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const name = getProjectName(project);
  const isTeam = project.type === ProjectType.TEAM;
  const palette =
    isTeam && project.icon ? PROJECT_COLOR_PALETTE[project.icon.color] : null;

  const badge = (
    <span
      className="flex size-[18px] shrink-0 items-center justify-center rounded-[4px] text-[10px] font-bold"
      style={
        palette
          ? { backgroundColor: palette.color, color: palette.textColor }
          : undefined
      }
    >
      {isTeam ? (
        name.charAt(0).toUpperCase()
      ) : (
        <Lock className="size-3 text-sidebar-foreground/70" />
      )}
    </span>
  );

  const row = (
    <motion.button
      layout={!prefersReducedMotion}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen({ projectId: project.id, name });
      }}
      aria-label={name}
      className={cn(
        'flex shrink-0 items-center gap-3 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors',
        collapsed ? 'size-9 cursor-pointer justify-center' : 'h-9 w-full px-3',
        active && 'bg-sidebar-accent font-medium text-sidebar-foreground',
      )}
    >
      {badge}
      {!collapsed && (
        <span className="min-w-0 flex-1 truncate text-left">{name}</span>
      )}
    </motion.button>
  );

  if (!collapsed) {
    return row;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="right">{name}</TooltipContent>
    </Tooltip>
  );
}

function PinnedSortMenu({
  sort,
  onChange,
}: {
  sort: PinnedSort;
  onChange: (next: PinnedSort) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('Sort pinned projects')}
        className={cn(
          RAIL_HEADER_ICON_BUTTON,
          'flex items-center justify-center data-[state=open]:bg-sidebar-accent',
        )}
      >
        <SlidersHorizontal className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-48">
        <PinnedMenuOption
          label={t('Recently added')}
          active={sort === 'added'}
          onClick={() => onChange('added')}
        />
        <PinnedMenuOption
          label={t('Recently used')}
          active={sort === 'recency'}
          onClick={() => onChange('recency')}
        />
        <PinnedMenuOption
          label={t('Alphabetical')}
          active={sort === 'alphabetical'}
          onClick={() => onChange('alphabetical')}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PinnedMenuOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem onClick={onClick} className="justify-between">
      {label}
      {active && <span className="text-primary">✓</span>}
    </DropdownMenuItem>
  );
}

function readStoredSort(stored: string | null): PinnedSort {
  return PINNED_SORTS.find((sort) => sort === stored) ?? 'added';
}

function lastFlowUpdatedAt(project: ProjectWithLimits): number {
  const lastFlowUpdated = project.analytics.lastFlowUpdated;
  if (isNil(lastFlowUpdated)) {
    return 0;
  }
  return new Date(lastFlowUpdated).getTime();
}

function compareProjects({ sort }: { sort: PinnedSort }) {
  return (a: ProjectWithLimits, b: ProjectWithLimits): number => {
    if (sort === 'alphabetical') {
      return getProjectName(a).localeCompare(getProjectName(b));
    }
    if (sort === 'added') {
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    }
    const flowA = lastFlowUpdatedAt(a);
    const flowB = lastFlowUpdatedAt(b);
    if (flowA !== flowB) {
      return flowB - flowA;
    }
    return new Date(b.updated).getTime() - new Date(a.updated).getTime();
  };
}

function orderProjects({
  projects,
  sort,
}: {
  projects: ProjectWithLimits[];
  sort: PinnedSort;
}): ProjectWithLimits[] {
  const compare = compareProjects({ sort });
  const personal = projects.filter(
    (project) => project.type !== ProjectType.TEAM,
  );
  const others = projects.filter(
    (project) => project.type === ProjectType.TEAM,
  );
  return [...personal.sort(compare), ...others.sort(compare)];
}

function RailAccountRow({
  collapsed,
  onMenuOpenChange,
}: {
  collapsed: boolean;
  onMenuOpenChange?: (open: boolean) => void;
}) {
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: user } = userHooks.useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isPlatformAdmin = useIsPlatformAdmin();

  const handleOpenChange = (open: boolean) => {
    setMenuOpen(open);
    onMenuOpenChange?.(open);
  };

  const isLoggedIn = authenticationSession.isLoggedIn();
  if (!user && !isLoggedIn) {
    return (
      <div className={cn('mt-2 flex items-center', collapsed ? 'px-2' : 'px-2')}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const searchParams = new URLSearchParams(window.location.search);
            searchParams.set('login', 'true');
            navigate(`${window.location.pathname}?${searchParams.toString()}`, { replace: true });
          }}
          title={t('Sign in')}
          className={cn(
            'flex items-center gap-2 rounded-lg border border-border/60 hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground text-xs font-medium cursor-pointer transition-colors',
            collapsed ? 'size-9 justify-center' : 'h-9 px-3 w-full justify-center',
          )}
        >
          <LogOut className="size-3.5 rotate-180" />
          {!collapsed && <span>{t('Sign in')}</span>}
        </button>
      </div>
    );
  }

  const handleLogout = () => {
    handleOpenChange(false);
    userHooks.invalidateCurrentUser(queryClient);
    authenticationSession.logOut();
    navigate('/sign-in');
  };

  const rawName =
    user?.firstName || user?.lastName
      ? user.firstName === user.lastName || !user.lastName
        ? user.firstName
        : `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : undefined;

  const displayName = rawName || user?.email?.split('@')[0] || t('Account');
  const userEmail = user?.email ?? '';
  const username =
    (user as any)?.username ||
    user?.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '') ||
    'user';

  return (
    <div
      className={cn(
        'mt-2 flex items-center',
        collapsed ? 'flex-col-reverse gap-1 px-2' : 'px-2',
      )}
    >
      <DropdownMenu modal={false} open={menuOpen} onOpenChange={handleOpenChange}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t('Account')}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'flex items-center gap-2.5 transition-colors hover:bg-sidebar-accent',
                  collapsed
                    ? 'size-9 cursor-pointer justify-center rounded-full'
                    : 'h-11 min-w-0 flex-1 px-2 py-1.5 w-full rounded-lg text-left cursor-pointer',
                )}
              >
                <div className="relative size-[24px] shrink-0">
                  <div className="size-full overflow-hidden rounded-full flex items-center justify-center">
                    <UserAvatar
                      className={cn('size-full object-cover', {
                        'scale-150': isNil(user?.imageUrl),
                      })}
                      name={displayName}
                      email={userEmail}
                      imageUrl={user?.imageUrl}
                      size={24}
                      disableTooltip={true}
                    />
                  </div>
                  {isPlatformAdmin && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex size-[10px] items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <ShieldCheck className="size-[7px]" />
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <>
                    <div className="grid min-w-0 flex-1 text-left text-xs leading-tight">
                      <span className="truncate font-semibold text-sm text-sidebar-foreground">
                        {displayName}
                      </span>
                      <span className="truncate text-muted-foreground text-[11px] font-mono">
                        @{username}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground/70" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">{t('Account')}</TooltipContent>
          )}
        </Tooltip>
        <DropdownMenuContent
          className="w-56 rounded-lg z-999"
          side="right"
          align="end"
          sideOffset={10}
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <div className="size-8 shrink-0 overflow-hidden rounded-full">
                <UserAvatar
                  className="size-full object-cover"
                  name={displayName}
                  email={userEmail}
                  imageUrl={user?.imageUrl}
                  size={32}
                  disableTooltip={true}
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {displayName}
                </span>
                <span className="truncate text-xs font-mono text-muted-foreground">
                  @{username}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {isPlatformAdmin && (
              <DropdownMenuItem
                onClick={() => {
                  handleOpenChange(false);
                  navigate('/platform/projects');
                }}
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                <span className="flex-1">{t('Platform Admin')}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                handleOpenChange(false);
                setAccountSettingsOpen(true);
              }}
            >
              <UserCogIcon className="w-4 h-4 mr-2" />
              {t('Account Settings')}
            </DropdownMenuItem>
            <HelpAndFeedback />
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            {t('Log out')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AccountSettingsDialog
        open={accountSettingsOpen}
        onClose={() => setAccountSettingsOpen(false)}
      />
    </div>
  );
}

const RAIL_HEADER_ICON_BUTTON =
  'size-6 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground [&_svg]:size-3.5!';

const PINNED_SORT_KEY = 'rail-pinned-sort';

const PINNED_SORTS = ['added', 'recency', 'alphabetical'] as const;

type PinnedSort = (typeof PINNED_SORTS)[number];
