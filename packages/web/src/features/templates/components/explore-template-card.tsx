import { Template } from '@activepieces/shared';
import { t } from 'i18next';
import React from 'react';
import { Check } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { PieceIconList, PieceIconWithPieceName } from '@/features/pieces';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type TemplateCardProps = {
  template: Template;
  onTemplateSelect: (template: Template) => void;
};

export const ExploreTemplateCard = React.memo(
  ({ template, onTemplateSelect }: TemplateCardProps) => {
    const hasFlows = template.flows && template.flows.length > 0;

    return (
      <Card
        onClick={() => onTemplateSelect(template)}
        className="group relative flex flex-col justify-between h-[190px] w-full p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
      >
        <div className="flex flex-col gap-1.5 min-h-0">
          <h3 className="font-semibold text-[15px] leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {template.name}
          </h3>

          <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
            {template.summary ? (
              template.summary
            ) : (
              <span className="italic opacity-60">{t('No summary available')}</span>
            )}
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
          <div className="flex items-center gap-1">
            {template.pieces && template.pieces.length > 0 ? (
              template.pieces.slice(0, 3).map((pieceName) => (
                <PieceIconWithPieceName
                  key={pieceName}
                  pieceName={pieceName}
                  size="sm"
                  border={false}
                  showTooltip={true}
                />
              ))
            ) : hasFlows && template.flows![0]?.trigger ? (
              <PieceIconList
                trigger={template.flows![0]?.trigger}
                maxNumberOfIconsToShow={3}
                size="sm"
                className="flex items-center gap-1"
                excludeCore={true}
              />
            ) : null}
          </div>

          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative flex items-center">
                  <div className="size-6 rounded-full border border-border/60 bg-background overflow-hidden flex items-center justify-center">
                    <img
                      src="/logo.png"
                      alt="Anticeil"
                      className="size-4 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.svg';
                      }}
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5 items-center justify-center rounded-full bg-emerald-500 text-white ring-1 ring-background">
                    <Check className="size-1.5 stroke-[3]" />
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <span>{t('Verified by Anticeil')}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>
    );
  },
);

ExploreTemplateCard.displayName = 'ExploreTemplateCard';

