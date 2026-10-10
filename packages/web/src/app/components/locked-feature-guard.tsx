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

  const resolvedDocsUrl = lockDocumentationUrl
    ? lockDocumentationUrl.includes('activepieces.com/docs/')
      ? `/docs/${lockDocumentationUrl.split('activepieces.com/docs/')[1].replace(/\/$/, '')}`
      : lockDocumentationUrl
    : undefined;

  return (
    <div className="flex flex-1 h-full w-full flex-col items-center justify-center p-6 text-center my-auto">
      <div className="flex flex-col gap-3 justify-center items-center max-w-xl text-center">
        {lockTitle && (
          <h1 className="text-3xl font-bold tracking-tight text-center">
            {lockTitle}
          </h1>
        )}
        {lockDescription && (
          <p className="text-base text-muted-foreground max-w-md text-center leading-relaxed">
            {lockDescription}
            {resolvedDocsUrl && (
              <>
                {' '}
                <a
                  href={resolvedDocsUrl}
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
