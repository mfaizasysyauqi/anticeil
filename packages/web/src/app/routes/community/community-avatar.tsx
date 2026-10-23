import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CommunityAvatarProps {
  name: string;
  email?: string;
  imageUrl?: string | null;
  size?: number;
  status?: 'online' | 'idle' | 'offline';
  className?: string;
  showStatus?: boolean;
  tooltipText?: string;
}

// Generate consistent modern gradient background for names
function getInitialsGradient(name: string): { bg: string; text: string } {
  const gradients = [
    { bg: 'from-blue-600 to-indigo-600', text: 'text-white' },
    { bg: 'from-purple-600 to-violet-600', text: 'text-white' },
    { bg: 'from-emerald-600 to-teal-600', text: 'text-white' },
    { bg: 'from-amber-600 to-orange-600', text: 'text-white' },
    { bg: 'from-rose-600 to-pink-600', text: 'text-white' },
    { bg: 'from-cyan-600 to-blue-600', text: 'text-white' },
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function CommunityAvatar({
  name,
  email,
  imageUrl,
  size = 36,
  status,
  className,
  showStatus = false,
  tooltipText,
}: CommunityAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name);
  const gradient = getInitialsGradient(name);

  const statusIndicator = showStatus && status && (
    <span
      className={cn(
        'absolute bottom-0 right-0 rounded-full ring-2 ring-background z-10 shrink-0 pointer-events-none',
        size >= 36 ? 'w-3 h-3' : 'w-2.5 h-2.5',
        status === 'online' && 'bg-emerald-500',
        status === 'idle' && 'bg-amber-500',
        status === 'offline' && 'bg-zinc-500',
      )}
    />
  );

  const avatarCircle = (
    <div
      className={cn(
        'relative inline-flex shrink-0 rounded-full select-none items-center justify-center',
        className,
      )}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center shadow-xs ring-1 ring-border/60"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover rounded-full aspect-square"
          />
        ) : (
          <div
            className={cn(
              'w-full h-full flex items-center justify-center rounded-full bg-gradient-to-br font-bold tracking-tight',
              gradient.bg,
              gradient.text,
            )}
            style={{ fontSize: `${Math.max(10, Math.floor(size * 0.38))}px` }}
          >
            {initials}
          </div>
        )}
      </div>
      {statusIndicator}
    </div>
  );

  if (tooltipText || email) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div className="cursor-pointer inline-flex shrink-0">{avatarCircle}</div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs font-medium">
            {tooltipText || `${name} ${email ? `(${email})` : ''}`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return avatarCircle;
}
