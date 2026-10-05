import { isNil } from '@activepieces/core-utils';
import {
  Template,
  TemplateTelemetryEventType,
  TemplateType,
  UncategorizedFolderId,
} from '@activepieces/shared';
import { t } from 'i18next';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { LoginModal } from '@/components/custom/login-modal';
import { PageHeader } from '@/components/custom/page-header';
import { SearchInput } from '@/components/custom/search-input';
import { Button } from '@/components/ui/button';
import { flowHooks } from '@/features/flows';
import { templatesTelemetryApi, templatesHooks } from '@/features/templates';
import { platformHooks } from '@/hooks/platform-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import { DASHBOARD_CONTENT_PADDING_X } from '@/lib/utils';

import { AllCategoriesView } from './all-categories-view';
import { CategoryFilterCarousel } from './category-filter-carousel';
import { CONTENT_CREATOR_TEMPLATES } from './content-creator-templates';
import { EmptyTemplatesView } from './empty-templates-view';
import { SelectedCategoryView } from './selected-category-view';

const TemplatesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = authenticationSession.getToken();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(
    () => isNil(token) && searchParams.get('login') === 'true',
  );

  const { data: templateCategories } = templatesHooks.useTemplateCategories();
  const isShowingOfficialTemplates = true;
  const { templates, isLoading, search, setSearch, category, setCategory } =
    templatesHooks.useTemplates(
      TemplateType.OFFICIAL,
    );
  const selectedCategory = category as string;
  const { data: allOfficialTemplates, isLoading: isAllTemplatesLoading } =
    templatesHooks.useAllOfficialTemplates();
  const { mutate: createFlow, isPending: isCreateFlowPending } =
    flowHooks.useStartFromScratch(UncategorizedFolderId);

  const handleStartFromScratch = () => {
    if (isNil(token)) {
      setIsLoginModalOpen(true);
      return;
    }
    createFlow();
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleTemplateSelect = useCallback(
    (template: Template) => {
      navigate(`/templates/${template.id}`);
      if (template.type === TemplateType.OFFICIAL) {
        templatesTelemetryApi.sendEvent({
          eventType: TemplateTelemetryEventType.VIEW,
          templateId: template.id,
        });
      }
    },
    [navigate],
  );

  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, Template[]> = {} as Record<
      string,
      Template[]
    >;

    if (isShowingOfficialTemplates) {
      allOfficialTemplates?.forEach((template: Template) => {
        if (template.categories?.length) {
          template.categories?.forEach((category: string) => {
            if (!grouped[category]) {
              grouped[category] = [];
            }
            grouped[category].push(template);
          });
        }
      });
    }

    return grouped;
  }, [allOfficialTemplates, isShowingOfficialTemplates]);

  const categories = useMemo(() => {
    const cats = templateCategories || [];
    const hasContentCreator = cats.includes('Content Creator');
    const base = hasContentCreator ? cats : ['Content Creator', ...cats];
    return ['All', ...base];
  }, [templateCategories]);

  const selectedCategoryTemplates = useMemo(() => {
    if (selectedCategory === 'All') {
      return templates || [];
    }
    if (selectedCategory === 'Content Creator') {
      return CONTENT_CREATOR_TEMPLATES;
    }
    return templatesByCategory[selectedCategory] || [];
  }, [selectedCategory, templates, templatesByCategory]);

  const showLoading =
    isLoading || (isShowingOfficialTemplates && isAllTemplatesLoading);
  const showAllCategories =
    isShowingOfficialTemplates && selectedCategory === 'All';
  const hasTemplates = showAllCategories
    ? (allOfficialTemplates && allOfficialTemplates.length > 0) || CONTENT_CREATOR_TEMPLATES.length > 0
    : selectedCategoryTemplates.length > 0;

  const showCategoryTitleForOfficialTemplates =
    isShowingOfficialTemplates && selectedCategory !== 'All';

  return (
    <div>
      <LoginModal
        open={isLoginModalOpen}
        onOpenChange={(open) => {
          setIsLoginModalOpen(open);
          if (!open && searchParams.get('login')) {
            searchParams.delete('login');
            setSearchParams(searchParams, { replace: true });
          }
        }}
      />
      <div>
        <div className="sticky top-0 z-10 bg-background">
          <PageHeader
            className="static"
            title={
              <>
                <div className="flex flex-row w-full justify-between gap-1">
                  <SearchInput
                    value={search}
                    onChange={handleSearchChange}
                    placeholder={t('Search templates by name or description')}
                  ></SearchInput>
                  <div className="flex flex-row justify-end w-[50%]">
                    <Button
                      variant="outline"
                      className="gap-2 h-full"
                      onClick={handleStartFromScratch}
                      disabled={isCreateFlowPending}
                    >
                      <Plus className="w-4 h-4" />
                      {t('Start from scratch')}
                    </Button>
                  </div>
                </div>
              </>
            }
          ></PageHeader>

          {isShowingOfficialTemplates && categories && (
            <CategoryFilterCarousel
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={setCategory}
            />
          )}
        </div>
        <div className={DASHBOARD_CONTENT_PADDING_X}>
          {!hasTemplates && !showLoading ? (
            <EmptyTemplatesView />
          ) : showAllCategories ? (
            <AllCategoriesView
              templatesByCategory={templatesByCategory}
              categories={categories}
              onCategorySelect={setCategory}
              onTemplateSelect={handleTemplateSelect}
              isLoading={showLoading}
              hideHeader={!isShowingOfficialTemplates}
              contentCreatorTemplates={CONTENT_CREATOR_TEMPLATES}
            />
          ) : (
            <SelectedCategoryView
              category={selectedCategory}
              templates={selectedCategoryTemplates}
              onTemplateSelect={handleTemplateSelect}
              isLoading={showLoading}
              showCategoryTitle={showCategoryTitleForOfficialTemplates}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export { TemplatesPage };
