import { t } from 'i18next';
import { Lock, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useRealtimeCollaboration } from '@/components/providers/socket-provider';
import { usePresence } from '@/hooks/use-presence';

import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

import { ApAvatar } from './ap-avatar';

const MAX_VISIBLE_AVATARS = 5;
const AVATAR_SIZE = 28;
const BORDER_COLORS = [
  'hsl(var(--destructive-500))',
  'hsl(var(--chart-1))',
  'hsl(var(--warning-500))',
  'hsl(var(--success-500))',
  'hsl(var(--chart-2))',
  'hsl(var(--primary))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-4))',
];

function getBorderColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return BORDER_COLORS[Math.abs(hash) % BORDER_COLORS.length];
}

export function ActiveUsersWidget({ resourceId }: ActiveUsersWidgetProps) {
  const navigate = useNavigate();
  const { isPlanPlusOrAbove, isConnected } = useRealtimeCollaboration();
  const activeUsers = usePresence({ resourceId });

  if (!isPlanPlusOrAbove) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate('/platform/billing')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border border-border bg-muted/60 hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
          >
            <Lock className="size-3 text-amber-500" />
            <span>{t('Multiplayer')}</span>
            <span className="text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded-full">
              Plus+
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-center text-xs">
          {t('Realtime presence cursors & multi-user collaboration require Plan Plus or above (hosted on VM Oracle). Click to upgrade.')}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (activeUsers.length === 0) {
    return null;
  }

  const visibleUsers = activeUsers.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = activeUsers.length - MAX_VISIBLE_AVATARS;

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 pr-1 cursor-help">
            <span className="relative flex h-2 w-2">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isConnected ? 'bg-emerald-500' : 'bg-muted-foreground'
                }`}
              ></span>
            </span>
            <Radio className="size-3.5 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {isConnected
            ? t('Live multi-user collaboration active (Oracle VM)')
            : t('Connecting to Oracle VM Realtime...')}
        </TooltipContent>
      </Tooltip>

      {visibleUsers.map((user) => (
        <div
          key={user.userId}
          className="rounded-full border-2"
          style={{ borderColor: getBorderColor(user.userId) }}
        >
          <ApAvatar id={user.userId} size="small" />
        </div>
      ))}
      {overflowCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground border"
              style={{ width: `${AVATAR_SIZE}px`, height: `${AVATAR_SIZE}px` }}
            >
              +{overflowCount}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t('+{count} more', { count: overflowCount })}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

type ActiveUsersWidgetProps = {
  resourceId: string;
};
