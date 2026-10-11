import { PlatformRole, UserStatus } from '@activepieces/shared';
import { t } from 'i18next';
import {
  CircleMinus,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash,
} from 'lucide-react';
import { useState } from 'react';

import { ConfirmationDeleteDialog } from '@/components/custom/delete-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { platformHooks } from '@/hooks/platform-hooks';
import { authenticationSession } from '@/lib/authentication-session';

import { UserRowData } from '../index';

import { UpdateUserDialog } from './update-user-dialog';

type UserActionsProps = {
  row: UserRowData;
  isUpdatingStatus: boolean;
  onDelete: (id: string, isInvitation: boolean) => Promise<void> | void;
  onToggleStatus: (userId: string, currentStatus: UserStatus) => void;
  onUpdate: () => void;
};

export const UserActions = ({
  row,
  isUpdatingStatus,
  onDelete,
  onToggleStatus,
  onUpdate,
}: UserActionsProps) => {
  const [open, setOpen] = useState(false);
  const { platform } = platformHooks.useCurrentPlatform();
  const currentUserId = authenticationSession.getCurrentUserId();
  const isInvitation = row.type === 'invitation';
  const isAdmin = !isInvitation && row.data.platformRole === PlatformRole.ADMIN;
  const isActive = !isInvitation && row.data.status === UserStatus.ACTIVE;
  const isPlatformOwner = !isInvitation && platform?.ownerId === row.data.id;
  const isCurrentUser = !isInvitation && currentUserId === row.data.id;
  const cannotDelete = isPlatformOwner || isCurrentUser;

  return (
    <div className="flex justify-end">
      <DropdownMenu modal={true} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {!isInvitation && (
            <UpdateUserDialog
              userId={row.data.id}
              role={row.data.platformRole}
              externalId={row.data.externalId ?? undefined}
              onUpdate={onUpdate}
            >
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="h-4 w-4" />
                {t('Edit')}
              </DropdownMenuItem>
            </UpdateUserDialog>
          )}
          {!isInvitation && (
            <DropdownMenuItem
              disabled={isAdmin || isUpdatingStatus}
              onSelect={() => {
                onToggleStatus(row.data.id, row.data.status);
                setOpen(false);
              }}
            >
              {isActive ? (
                <CircleMinus className="h-4 w-4" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {isActive ? t('Deactivate') : t('Activate')}
            </DropdownMenuItem>
          )}
          {cannotDelete ? (
            <DropdownMenuItem
              disabled={true}
              className="text-muted-foreground opacity-50 cursor-not-allowed flex items-center gap-2"
            >
              <Trash className="h-4 w-4" />
              <span>
                {isPlatformOwner
                  ? t('Owner Platform (Tidak dapat dihapus)')
                  : t('Akun Anda (Tidak dapat dihapus)')}
              </span>
            </DropdownMenuItem>
          ) : (
            <ConfirmationDeleteDialog
              title={isInvitation ? t('Delete Invitation') : t('Delete User')}
              message={
                isInvitation
                  ? t('This invitation will be permanently deleted.')
                  : t('This user and all their data will be permanently deleted.')
              }
              entityName={`${isInvitation ? t('Invitation') : t('User')} ${
                row.data.email
              }`}
              mutationFn={async () => {
                await onDelete(isInvitation ? row.id : row.data.id, isInvitation);
              }}
            >
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => e.preventDefault()}
              >
                <Trash className="h-4 w-4" />
                {t('Delete')}
              </DropdownMenuItem>
            </ConfirmationDeleteDialog>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
