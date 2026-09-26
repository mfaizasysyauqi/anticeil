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
  lockVideoUrl,
  lockDocumentationUrl,
}: LockedFeatureGuardProps) => {
  const { openDialog: openManagePlanDialog } = useManagePlanDialogStore();

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[calc(100vh-100px)] w-full flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-col gap-2 justify-center items-center max-w-xl text-center">
        {lockTitle && <h1 className="text-3xl font-bold">{lockTitle}</h1>}
        <div className="text-center w-full max-w-[485px] my-4 flex flex-col gap-2 justify-center items-center">
          {lockDescription && (
            <p className="text-md leading-relaxed text-muted-foreground">
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

          <div className="my-4">
            <Button onClick={() => openManagePlanDialog()}>
              {t('Upgrade plan')}
            </Button>
          </div>
        </div>

        {lockVideoUrl && (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="max-w-[70vh] rounded-lg shadow-md"
            controls={false}
            src={lockVideoUrl}
          />
        )}
      </div>
    </div>
  );
};
