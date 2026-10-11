import { Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useManagePlanDialogStore } from '@/features/billing';

export function FeatureBanner({ message }: { message: string }) {
  const { openDialog } = useManagePlanDialogStore();

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
      <div className="flex items-center gap-2">
        <Lock className="size-4 shrink-0 text-amber-500" />
        <span>{message}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => openDialog()}
        className="h-8 shrink-0"
      >
        Upgrade
      </Button>
    </div>
  );
}
