import { ApEdition, ApFlagId } from '@activepieces/shared';
import { Menu, Search } from 'lucide-react';
import { useState } from 'react';

import { useEmbedding } from '@/components/providers/embed-provider';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar-shadcn';
import { ManagePlanDialog } from '@/features/billing';
import { flagsHooks } from '@/hooks/flags-hooks';
import { cn } from '@/lib/utils';

import {
  GlobalSearchProvider,
  useGlobalSearch,
} from '../global-search/global-search-context';
import { MobilePrimaryRailSheet, PrimaryRail } from '../primary-rail';

export function BuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalSearchProvider>
      <BuilderLayoutInner>{children}</BuilderLayoutInner>
    </GlobalSearchProvider>
  );
}

function BuilderLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);
  const { embedState } = useEmbedding();
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const branding = flagsHooks.useWebsiteBranding();

  return (
    <div className="flex flex-col lg:flex-row h-svh w-full overflow-hidden">
      {!embedState.isEmbedded && (
        <>
          <PrimaryRail />
          <MobilePrimaryRailSheet
            open={mobileNavOpen}
            onOpenChange={setMobileNavOpen}
          />
        </>
      )}

      {/* Mobile / Tablet Top Navigation Bar (screens < 1024px) */}
      {!embedState.isEmbedded && (
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
        hoverMode={!searchOpen}
        defaultOpen={false}
        className="flex-1 min-w-0 w-auto will-change-transform"
      >
        <SidebarInset className="flex flex-col h-full overflow-hidden bg-sidebar">
          <div
            className={cn(
              'flex-1 flex flex-col overflow-hidden',
              !embedState.isEmbedded && 'p-1.5',
            )}
          >
            <div
              className={cn(
                'flex flex-col h-full bg-background overflow-hidden',
                embedState.isEmbedded
                  ? 'border-l'
                  : 'rounded-xl shadow-[2px_0px_4px_-2px_rgba(0,0,0,0.05),0px_2px_4px_-2px_rgba(0,0,0,0.05)] border',
              )}
            >
              {children}
            </div>
          </div>
          {edition !== ApEdition.COMMUNITY && <ManagePlanDialog />}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
