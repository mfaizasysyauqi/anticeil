import { ApEdition, ApFlagId } from '@activepieces/shared';
import { Menu, Search } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar-shadcn';
import { ManagePlanDialog } from '@/features/billing';
import { flagsHooks } from '@/hooks/flags-hooks';

import { AllowOnlyLoggedInUserOnlyGuard } from './allow-logged-in-user-only-guard';
import { GlobalSearchProvider, useGlobalSearch } from './global-search/global-search-context';
import { MobilePlatformSidebarSheet, PlatformSidebar } from './sidebar/platform';

export function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);

  return (
    <AllowOnlyLoggedInUserOnlyGuard>
      <GlobalSearchProvider>
        <PlatformLayoutInner edition={edition}>
          {children}
        </PlatformLayoutInner>
        {edition !== ApEdition.COMMUNITY && <ManagePlanDialog />}
      </GlobalSearchProvider>
    </AllowOnlyLoggedInUserOnlyGuard>
  );
}

function PlatformLayoutInner({
  edition,
  children,
}: {
  edition: ApEdition | null | undefined;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { setOpen: setSearchOpen } = useGlobalSearch();
  const branding = flagsHooks.useWebsiteBranding();

  return (
    <div className="flex flex-col lg:flex-row h-svh w-full overflow-hidden">
      {/* Desktop sidebar — hidden on mobile/tablet */}
      <div className="hidden lg:flex">
        <SidebarProvider open={true}>
          <PlatformSidebar />
        </SidebarProvider>
      </div>

      {/* Mobile/tablet drawer */}
      <MobilePlatformSidebarSheet
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
      />

      {/* Mobile/Tablet top app bar (< lg) */}
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          className="size-8 rounded-full text-sidebar-foreground/80 hover:bg-sidebar-accent cursor-pointer"
        >
          <Search className="size-4" />
        </Button>
      </header>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-sidebar">
        <div className="flex-1 flex flex-col p-0 sm:p-2 sm:pt-3 sm:pb-3 overflow-hidden">
          <div
            id="dashboard-content-container"
            className="relative flex flex-col h-full bg-background rounded-none sm:rounded-xl shadow-[2px_0px_4px_-2px_rgba(0,0,0,0.05),0px_2px_4px_-2px_rgba(0,0,0,0.05)] border-0 sm:border overflow-clip"
          >
            <div className="flex flex-col flex-1 overflow-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
