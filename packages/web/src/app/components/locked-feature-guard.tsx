import { t } from 'i18next';
import { ExternalLink, Lock } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { useManagePlanDialogStore } from '@/features/billing';

export type LockedFeatureGuardProps = {
  children: React.ReactNode;
  locked?: boolean;
  lockTitle?: string;
  lockDescription?: string;
  lockVideoUrl?: string;
  lockDocumentationUrl?: string;
  featureKey?: string;
  lockTier?: string;
  showContactSales?: boolean;
};

const getTierFromKey = (key?: string): string => {
  switch (key) {
    case 'UNIVERSAL_AI':
    case 'BRANDING':
    case 'CUSTOM_APPEARANCE':
    case 'PROJECTS':
    case 'AUDIT_LOGS':
    case 'API':
      return 'Plus';
    case 'GLOBAL_CONNECTIONS':
    case 'SSO':
    case 'CUSTOM_ROLES':
    case 'PROJECT_ROLES':
    case 'ENVIRONMENTS':
    case 'SECRET_MANAGERS':
    case 'TEMPLATES':
    case 'PIECE_SETS':
      return 'Team';
    case 'EVENT_DESTINATIONS':
    case 'SIGNING_KEYS':
    case 'SCIM':
    default:
      return 'Enterprise';
  }
};

export const LockedFeatureGuard = ({
  children,
  locked = false,
  lockTitle,
  lockDescription,
  lockDocumentationUrl,
  featureKey,
  lockTier,
}: LockedFeatureGuardProps) => {
  const { openDialog: openManagePlanDialog } = useManagePlanDialogStore();

  if (!locked) {
    return <>{children}</>;
  }

  const resolvedDocsUrl = lockDocumentationUrl
    ? lockDocumentationUrl.includes('activepieces.com/docs/')
      ? `/docs/${lockDocumentationUrl.split('activepieces.com/docs/')[1].replace(/\/$/, '')}`
      : lockDocumentationUrl
    : undefined;

  const tier = lockTier ?? getTierFromKey(featureKey);

  return (
    <div className="relative flex flex-1 min-h-0 min-w-0 w-full h-full flex-col overflow-hidden">
      {/* Background Sneak Peek: Children rendered dimly in background */}
      <div
        inert
        aria-hidden="true"
        className="flex flex-1 min-h-0 min-w-0 w-full flex-col pointer-events-none select-none opacity-25 filter blur-[0.2px]"
      >
        {children}
      </div>

      {/* Foreground Floating Unlock Dialog Card */}
      <div className="absolute inset-0 grid place-items-center overflow-auto p-6 z-20">
        <div className="pointer-events-auto flex w-full max-w-md flex-col items-center text-center gap-4 p-8 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-2xl">
          {/* Lock Icon inside teal square */}
          <div className="grid size-12 place-items-center rounded-xl bg-teal-950/70 border border-teal-800/60 text-teal-400 mb-1 shadow-inner">
            <Lock className="size-6 text-teal-300" />
          </div>

          <div className="flex flex-col gap-2">
            {lockTitle && (
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {lockTitle}
              </h2>
            )}
            {lockDescription && (
              <p className="text-sm leading-relaxed text-muted-foreground max-w-sm">
                {lockDescription}
              </p>
            )}
          </div>

          <div className="w-full flex flex-col gap-3 mt-2">
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-teal-900/25 transition-all"
              onClick={() => openManagePlanDialog()}
            >
              {t('Upgrade to {tier}', { tier })}
            </Button>

            {resolvedDocsUrl && (
              <a
                href={resolvedDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{t('Read the docs')}</span>
                <ExternalLink className="size-3" />
              </a>
            )}

            <div className="h-px w-full bg-border/60 my-0.5" />

            <span className="text-xs text-muted-foreground/80">
              {t('Included with the {tier} plan and above.', { tier })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LockedFeatureGuard;
