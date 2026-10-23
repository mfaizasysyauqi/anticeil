import { useState } from 'react';
import { isNil } from '@activepieces/core-utils';
import Avatar from 'boring-avatars';

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type UserAvatarProps = {
  name: string;
  email: string;
  size: number;
  disableTooltip?: boolean;
  imageUrl?: string | null;
  className?: string;
  withoutBorder?: boolean;
};

export function UserAvatar({
  name,
  email,
  size,
  disableTooltip = false,
  imageUrl,
  className,
  withoutBorder = false,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const tooltip = `${name} (${email})`;

  const avatarElement =
    !isNil(imageUrl) && !hasError ? (
      <img
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        onError={() => setHasError(true)}
        className={cn('rounded-full aspect-square object-cover', className)}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    ) : (
      <Avatar
        name={email || name}
        size={size}
        colors={['#0a0310', '#49007e', '#ff005b', '#ff7d10', '#ffb238']}
        variant="beam"
        className={cn('rounded-full aspect-square object-cover', className)}
      />
    );

  if (disableTooltip) {
    return avatarElement;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden',
            { 'ring-1 ring-border': !withoutBorder },
          )}
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          {avatarElement}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
