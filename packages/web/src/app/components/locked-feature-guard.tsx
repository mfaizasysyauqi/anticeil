import { t } from 'i18next';
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
  showContactSales?: boolean;
};

export const LockedFeatureGuard = ({
  children,
  locked = false,
  lockTitle,
  lockDescription,
  lockDocumentationUrl,
}: LockedFeatureGuardProps) => {
  const { openDialog: openManagePlanDialog } = useManagePlanDialogStore();

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] h-full w-full flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-col gap-3 justify-center items-center max-w-xl text-center">
        {lockTitle && (
          <h1 className="text-3xl font-bold tracking-tight text-center">
            {lockTitle}
          </h1>
        )}
        {lockDescription && (
          <p className="text-base text-muted-foreground max-w-md text-center leading-relaxed">
            {lockDescription}
            {lockDocumentationUrl && (
              <>
                {' '}
                <a
                  href={lockDocumentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  {t('Learn more')}
                </a>
              </>
            )}
          </p>
        )}

        <div className="mt-4 flex justify-center items-center">
          <Button onClick={() => openManagePlanDialog()}>
            {t('Upgrade plan')}
          </Button>
        </div>
      </div>
    </div>
  );
};
