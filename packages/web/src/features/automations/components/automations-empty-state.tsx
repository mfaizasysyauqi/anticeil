import { Permission } from '@activepieces/core-utils';
import {
  Template,
  TemplateType,
  UncategorizedFolderId,
} from '@activepieces/shared';
import { t } from 'i18next';
import {
  ChevronRight,
  Plus,
  Sparkles,
  Table2,
  Upload,
  Workflow,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PermissionNeededTooltip } from '@/components/custom/permission-needed-tooltip';
import { useEmbedding } from '@/components/providers/embed-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ImportFlowDialog } from '@/features/flows/components/import-flow-dialog';
import { flowHooks } from '@/features/flows/hooks/flow-hooks';
import { ImportTableDialog } from '@/features/tables/components/import-table-dialog';
import { tableHooks } from '@/features/tables/hooks/table-hooks';
import { TemplatesBrowseDialog } from '@/features/templates';
import { ExploreTemplateCard } from '@/features/templates/components/explore-template-card';
import { UseTemplateDialog } from '@/features/templates/components/use-template-dialog';
import { templatesHooks } from '@/features/templates/hooks/templates-hook';
import { useAuthorization } from '@/hooks/authorization-hooks';
import { flagsHooks } from '@/hooks/flags-hooks';
import { platformHooks } from '@/hooks/platform-hooks';

type ActionRowProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  hasPermission?: boolean;
};

const ActionRow = ({
  icon,
  label,
  onClick,
  disabled,
  hasPermission = true,
}: ActionRowProps) => {
  const content = (
    <button
      onClick={onClick}
      disabled={disabled || !hasPermission}
      className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-t border-border"
    >
      <div className="flex items-center gap-3">
        <span className="text-foreground/60 dark:text-foreground/70">{icon}</span>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-foreground/40 dark:text-foreground/60" />
    </button>
  );

  if (!hasPermission) {
    return (
      <PermissionNeededTooltip hasPermission={hasPermission}>
        {content}
      </PermissionNeededTooltip>
    );
  }

  return content;
};

type GetStartedCardProps = {
  icon: React.ReactNode;
  iconBgClass: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

const GetStartedCard = ({
  icon,
  iconBgClass,
  title,
  description,
  children,
}: GetStartedCardProps) => {
  return (
    <Card className="flex-1 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 px-4 py-4">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBgClass}`}
          >
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-base">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex flex-col">{children}</div>
      </CardContent>
    </Card>
  );
};

const TemplateCardSkeleton = () => {
  return (
    <Card className="h-[190px] w-full p-4 rounded-xl border border-border/50 bg-card/40 flex flex-col justify-between">
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md mt-2" />
        <Skeleton className="h-4 w-2/3 rounded-md" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="size-6 rounded-md" />
        </div>
        <Skeleton className="size-6 rounded-full" />
      </div>
    </Card>
  );
};

type AutomationsEmptyStateProps = {
  onRefresh: () => void;
};

export const AutomationsEmptyState = ({
  onRefresh,
}: AutomationsEmptyStateProps) => {
  const navigate = useNavigate();
  const { embedState } = useEmbedding();
  const [isImportTableDialogOpen, setIsImportTableDialogOpen] = useState(false);
  const [isTemplatesBrowseDialogOpen, setIsTemplatesBrowseDialogOpen] =
    useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [useTemplateDialogOpen, setUseTemplateDialogOpen] = useState(false);

  const { checkAccess } = useAuthorization();
  const userHasPermissionToWriteFlow = checkAccess(Permission.WRITE_FLOW);
  const userHasPermissionToWriteTable = checkAccess(Permission.WRITE_TABLE);

  const { platform } = platformHooks.useCurrentPlatform();
  const isShowingOfficialTemplates = true;
  const { templates, isLoading: isLoadingTemplates } =
    templatesHooks.useTemplates(
      TemplateType.OFFICIAL,
    );

  const { mutate: createFlow, isPending: isCreateFlowPending } =
    flowHooks.useStartFromScratch(UncategorizedFolderId);

  const { mutate: createTable, isPending: isCreateTablePending } =
    tableHooks.useCreateTable(UncategorizedFolderId);

  const handleTemplateSelect = (template: Template) => {
    if (embedState.isEmbedded) {
      setSelectedTemplate(template);
      setUseTemplateDialogOpen(true);
    } else {
      navigate(`/templates/${template.id}`);
    }
  };

  const handleViewAllTemplates = () => {
    if (embedState.isEmbedded) {
      setIsTemplatesBrowseDialogOpen(true);
    } else {
      navigate('/templates');
    }
  };

  const topTemplates = templates?.slice(0, 3) || [];
  const hasTemplates = topTemplates.length > 0;
  const branding = flagsHooks.useWebsiteBranding();

  return (
    <div className="flex flex-col gap-8 py-8 px-4 max-w-5xl mx-auto">
      <div>
        <h2 className="text-sm font-semibold text-foreground/70 dark:text-foreground/80 mb-4">
          {t('Get started with {brandName}', {
            brandName: branding.websiteName ?? platform.name,
          })}
        </h2>
        <div className="flex gap-4">
          <GetStartedCard
            icon={<Workflow className="h-5 w-5 text-primary dark:text-sky-400" />}
            iconBgClass="bg-primary/10 dark:bg-sky-950/60 border border-primary/20 dark:border-sky-500/30"
            title={t('Build a Flow')}
            description={t('Create automated workflows')}
          >
            <ActionRow
              icon={<Plus className="h-4 w-4" />}
              label={t('Start from scratch')}
              onClick={() => createFlow()}
              disabled={isCreateFlowPending}
              hasPermission={userHasPermissionToWriteFlow}
            />
            <PermissionNeededTooltip
              hasPermission={userHasPermissionToWriteFlow}
            >
              <ImportFlowDialog
                insideBuilder={false}
                onRefresh={onRefresh}
                folderId={UncategorizedFolderId}
              >
                <button
                  disabled={!userHasPermissionToWriteFlow}
                  className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-t border-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-foreground/60 dark:text-foreground/70">
                      <Upload className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-foreground">{t('Import')}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-foreground/40 dark:text-foreground/60" />
                </button>
              </ImportFlowDialog>
            </PermissionNeededTooltip>
            <ActionRow
              icon={<Sparkles className="h-4 w-4" />}
              label={t('Use Templates')}
              onClick={() => {
                if (embedState.isEmbedded) {
                  setIsTemplatesBrowseDialogOpen(true);
                } else {
                  navigate('/templates');
                }
              }}
              hasPermission={userHasPermissionToWriteFlow}
            />
          </GetStartedCard>

          {!embedState.hideTables && (
            <GetStartedCard
              icon={<Table2 className="h-5 w-5 text-primary dark:text-sky-400" />}
              iconBgClass="bg-primary/10 dark:bg-sky-950/60 border border-primary/20 dark:border-sky-500/30"
              title={t('Create a Table')}
              description={t('Organize and manage data')}
            >
              <ActionRow
                icon={<Plus className="h-4 w-4" />}
                label={t('Start from scratch')}
                onClick={() => createTable({ name: t('New Table') })}
                disabled={isCreateTablePending}
                hasPermission={userHasPermissionToWriteTable}
              />
              <ActionRow
                icon={<Upload className="h-4 w-4" />}
                label={t('Import')}
                onClick={() => setIsImportTableDialogOpen(true)}
                hasPermission={userHasPermissionToWriteTable}
              />
            </GetStartedCard>
          )}
        </div>
      </div>

      {(hasTemplates || isLoadingTemplates) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground/70 dark:text-foreground/80 flex items-center gap-2">
              {t('Templates For You')}
              <Sparkles className="h-4 w-4 text-yellow-400 dark:text-yellow-300" />
            </h2>
            <button
              onClick={handleViewAllTemplates}
              className="text-sm text-foreground/60 dark:text-foreground/70 hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {t('All templates')}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isLoadingTemplates ? (
              <>
                <TemplateCardSkeleton />
                <TemplateCardSkeleton />
                <TemplateCardSkeleton />
              </>
            ) : (
              topTemplates.map((template) => (
                <ExploreTemplateCard
                  key={template.id}
                  template={template}
                  onTemplateSelect={handleTemplateSelect}
                />
              ))
            )}
          </div>
        </div>
      )}

      {!embedState.hideTables && (
        <ImportTableDialog
          open={isImportTableDialogOpen}
          setIsOpen={setIsImportTableDialogOpen}
          showTrigger={false}
        />
      )}
      <TemplatesBrowseDialog
        open={isTemplatesBrowseDialogOpen}
        onOpenChange={setIsTemplatesBrowseDialogOpen}
      />
      {selectedTemplate && (
        <UseTemplateDialog
          key={selectedTemplate.id}
          template={selectedTemplate}
          open={useTemplateDialogOpen}
          onOpenChange={(isOpen) => {
            setUseTemplateDialogOpen(isOpen);
            if (!isOpen) setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
};
