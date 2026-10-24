import { isNil } from '@activepieces/core-utils';
import { useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { ChevronsUpDown, LogOut, ShieldCheck, UserCogIcon } from 'lucide-react';
import { useState } from 'react';

import { UserAvatar } from '@/components/custom/user-avatar';
import { useEmbedding } from '@/components/providers/embed-provider';
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar-shadcn';
import { useIsPlatformAdmin } from '@/hooks/authorization-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { cn } from '@/lib/utils';

import { AccountSettingsDialog } from '../account-settings';
import { HelpAndFeedback } from '../help-and-feedback';

export function SidebarUser() {
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const { embedState } = useEmbedding();
  const { data: user } = userHooks.useCurrentUser();
  const queryClient = useQueryClient();
  const isPlatformAdmin = useIsPlatformAdmin();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  if (!user || embedState.isEmbedded) {
    return null;
  }

  const handleLogout = () => {
    userHooks.invalidateCurrentUser(queryClient);
    authenticationSession.logOut();
  };

  const displayName =
    user.firstName === user.lastName || !user.lastName
      ? user.firstName
      : `${user.firstName} ${user.lastName}`.trim();

  const username = (user as any).username || user.email?.split('@')[0] || 'user';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu modal>
          <DropdownMenuTrigger asChild className="w-full">
            <SidebarMenuButton className="h-10! pl-2! group-data-[collapsible=icon]:h-10! group-data-[collapsible=icon]:pl-2!">
              <div className="relative size-[22px] shrink-0">
                <div className="size-full overflow-hidden flex items-center justify-center rounded-full">
                  <UserAvatar
                    className={cn('size-full object-cover', {
                      'scale-150': isNil(user.imageUrl),
                    })}
                    name={displayName}
                    email={user.email}
                    imageUrl={user.imageUrl}
                    size={22}
                    disableTooltip={true}
                  />
                </div>
                {isPlatformAdmin && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex size-[10px] items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <ShieldCheck className="size-[7px]" />
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <>
                  <span className="truncate">
                    {displayName}
                  </span>
                  <ChevronsUpDown className="ml-auto size-4" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg z-999"
            side="top"
            align="start"
            sideOffset={10}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="size-8 shrink-0 overflow-hidden rounded-full">
                  <UserAvatar
                    className="size-full object-cover"
                    name={displayName}
                    email={user.email}
                    imageUrl={user.imageUrl}
                    size={32}
                    disableTooltip={true}
                  />
                </div>

                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {displayName}
                  </span>
                  <span className="truncate text-xs font-mono text-muted-foreground">@{username}</span>
                  {isPlatformAdmin && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        <ShieldCheck className="size-2.5" />
                        {t('Platform Admin')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setAccountSettingsOpen(true)}>
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
      </SidebarMenuItem>

      <AccountSettingsDialog
        open={accountSettingsOpen}
        onClose={() => setAccountSettingsOpen(false)}
      />
    </SidebarMenu>
  );
}
