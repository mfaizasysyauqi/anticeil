import {
  AP_MAXIMUM_PROFILE_PICTURE_SIZE,
  PROFILE_PICTURE_ALLOWED_TYPES,
} from '@activepieces/shared';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { t } from 'i18next';
import { AtSign, Camera, Clock, Mail, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { UserAvatar } from '@/components/custom/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { userHooks, userMutations } from '@/hooks/user-hooks';

import { LanguageToggle } from './language-toggle';
import { ThemeToggle } from './theme-toggle';

export interface AccountSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AccountSettingsDialog({
  open,
  onClose,
}: AccountSettingsDialogProps) {
  const { data: user } = userHooks.useCurrentUser();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentDisplayName =
    user?.firstName === user?.lastName || !user?.lastName
      ? user?.firstName ?? ''
      : `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

  const [displayNameInput, setDisplayNameInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayNameInput(currentDisplayName);
      setUsernameInput(user.username ?? '');
    }
  }, [user, open, currentDisplayName]);

  const usernameCooldownEnd = user?.usernameUpdatedAt
    ? dayjs(user.usernameUpdatedAt).add(14, 'day')
    : null;
  const isUsernameCooldownActive =
    !!usernameCooldownEnd && usernameCooldownEnd.isAfter(dayjs());

  const uploadMutation = userMutations.useUploadProfilePicture({
    onSuccess: () => {
      userHooks.invalidateCurrentUser(queryClient);
      toast.success(t('Profile picture updated successfully'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('Failed to upload profile picture'));
    },
  });

  const updateNameMutation = userMutations.useUpdateName({
    onSuccess: () => {
      userHooks.invalidateCurrentUser(queryClient);
      toast.success(t('Nama tampilan berhasil diperbarui'));
    },
    onError: (error: any) => {
      toast.error(error.message || t('Gagal memperbarui nama tampilan'));
    },
  });

  const updateUsernameMutation = userMutations.useUpdateUsername({
    onSuccess: (data) => {
      userHooks.invalidateCurrentUser(queryClient);
      toast.success(t(`Username berhasil diubah menjadi @${data.username}`));
    },
    onError: (error: any) => {
      toast.error(error.message || t('Gagal memperbarui username'));
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > AP_MAXIMUM_PROFILE_PICTURE_SIZE) {
        toast.error(t('File size exceeds 5MB limit'));
        return;
      }
      if (!PROFILE_PICTURE_ALLOWED_TYPES.includes(file.type)) {
        toast.error(
          t('Invalid file type. Allowed types: JPEG, PNG, GIF, WEBP'),
        );
        return;
      }
      uploadMutation.mutate(file);
    }
    event.target.value = '';
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSaveDisplayName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayNameInput.trim();
    if (!trimmed || trimmed === currentDisplayName) return;
    updateNameMutation.mutate({ name: trimmed });
  };

  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = usernameInput.trim().toLowerCase();
    if (!trimmed || trimmed === user?.username) return;

    if (!/^[a-z0-9_]{3,32}$/.test(trimmed)) {
      toast.error(
        t('Username harus 3-32 karakter dan hanya mengandung huruf kecil, angka, dan garis bawah (_)')
      );
      return;
    }
    updateUsernameMutation.mutate(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl w-full max-h-[90vh] pb-4 flex flex-col px-5">
        <DialogHeader>
          <DialogTitle className="font-semibold text-base">
            {t('Pengaturan Akun')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1" viewPortClassName="px-1">
          <div className="space-y-5 py-1">
            {/* User Header Card */}
            <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/40 border border-border/60">
              <div
                className="relative group cursor-pointer"
                onClick={handleAvatarClick}
              >
                <UserAvatar
                  name={currentDisplayName}
                  email={user?.email ?? ''}
                  size={58}
                  disableTooltip
                  imageUrl={user?.imageUrl}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploadMutation.isPending}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate text-foreground">
                  {currentDisplayName || t('Pengguna')}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate mt-0.5">
                  <span className="font-mono text-primary font-medium">
                    @{user?.username || 'username'}
                  </span>
                  <span>•</span>
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
              </div>
            </div>

            {/* Section 1: Display Name (Editable anytime with rate limit protection) */}
            <form onSubmit={handleSaveDisplayName} className="space-y-3 p-3.5 rounded-xl border border-border bg-card">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>{t('Nama Lengkap / Nama Tampilan')}</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {t('Bebas Diubah Kapan Saja')}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t('Nama yang dilihat rekan tim di platform dan server obrolan. Tidak perlu unik, bebas spasi.')}
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder={t('Nama lengkap Anda')}
                  maxLength={100}
                  className="text-xs font-medium h-9"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    updateNameMutation.isPending ||
                    !displayNameInput.trim() ||
                    displayNameInput.trim() === currentDisplayName
                  }
                  className="shrink-0 h-9"
                >
                  {updateNameMutation.isPending ? t('Menyimpan...') : t('Simpan')}
                </Button>
              </div>
            </form>

            {/* Section 2: Unique Username (@handle) with 14-day Cooldown */}
            <form onSubmit={handleSaveUsername} className="space-y-3 p-3.5 rounded-xl border border-border bg-card">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-primary" />
                    <span>{t('Username Unik')}</span>
                  </label>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {t('Cooldown 14 Hari')}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t('Identifier unik sistem (@username) untuk mention dan undangan tanpa mempublikasikan email.')}
                </p>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">@</span>
                <Input
                  value={usernameInput}
                  onChange={(e) =>
                    setUsernameInput(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                    )
                  }
                  placeholder="username"
                  maxLength={32}
                  disabled={isUsernameCooldownActive}
                  className="pl-7 text-xs font-mono h-9"
                />
              </div>

              {isUsernameCooldownActive ? (
                <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-[11px]">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('Cooldown Perubahan Username Aktif')}</span>
                  </div>
                  <p className="text-muted-foreground text-[10px] leading-relaxed">
                    {t('Username baru saja diubah. Username dapat diubah kembali pada:')}{' '}
                    <strong className="text-foreground">
                      {dayjs(usernameCooldownEnd).format('DD MMMM YYYY, HH:mm')}
                    </strong>
                    .
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground">
                    {t('3-32 karakter: huruf kecil (a-z), angka (0-9), garis bawah (_).')}
                  </p>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      isUsernameCooldownActive ||
                      updateUsernameMutation.isPending ||
                      !usernameInput.trim() ||
                      usernameInput.trim() === user?.username
                    }
                    className="shrink-0 h-9"
                  >
                    {updateUsernameMutation.isPending ? t('Menyimpan...') : t('Simpan Username')}
                  </Button>
                </div>
              )}
            </form>

            <Separator />

            {/* Preferences (Theme & Language) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
