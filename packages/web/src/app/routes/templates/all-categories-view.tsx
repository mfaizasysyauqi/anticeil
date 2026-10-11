import { Template } from '@activepieces/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CategorySection } from './category-section';
import { CategorySectionSkeleton } from './skeletons/category-section-skeleton';

type AllCategoriesViewSkeletonProps = {
  hideHeader?: boolean;
};

const AllCategoriesViewSkeleton = ({
  hideHeader = false,
}: AllCategoriesViewSkeletonProps) => {
  return (
    <div className="space-y-6">
      {[...Array(4)].map((_, index) => (
        <CategorySectionSkeleton key={index} hideHeader={hideHeader} />
      ))}
    </div>
  );
};

function LazyCategorySection({
  category,
  templates,
  onCategorySelect,
  onTemplateSelect,
}: {
  category: string;
  templates: Template[];
  onCategorySelect: (category: string) => void;
  onTemplateSelect: (template: Template) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {isVisible ? (
        <CategorySection
          category={category}
          templates={templates}
          onCategorySelect={onCategorySelect}
          onTemplateSelect={onTemplateSelect}
        />
      ) : (
        <CategorySectionSkeleton />
      )}
    </div>
  );
}

type AllCategoriesViewProps = {
  templatesByCategory: Record<string, Template[]>;
  categories: string[];
  onCategorySelect: (category: string) => void;
  onTemplateSelect: (template: Template) => void;
  isLoading?: boolean;
  hideHeader?: boolean;
  contentCreatorTemplates?: Template[];
};

export const AllCategoriesView = ({
  templatesByCategory,
  categories,
  onCategorySelect,
  onTemplateSelect,
  isLoading = false,
  hideHeader = false,
  contentCreatorTemplates = [],
}: AllCategoriesViewProps) => {
  const stableOnCategorySelect = useCallback(onCategorySelect, [
    onCategorySelect,
  ]);
  const stableOnTemplateSelect = useCallback(onTemplateSelect, [
    onTemplateSelect,
  ]);

  if (isLoading) {
    return <AllCategoriesViewSkeleton hideHeader={hideHeader} />;
  }

  const featuredTemplates = templatesByCategory['Featured'];
  const otherCategories = categories.filter(
    (category) => category !== 'Featured' && category !== 'Content Creator',
  );

  return (
    <div className="space-y-6">
      {/* 1. Featured (Pilihan Utama) section at the top */}
      {featuredTemplates && featuredTemplates.length > 0 && (
        <CategorySection
          category="Featured"
          templates={featuredTemplates}
          onCategorySelect={stableOnCategorySelect}
          onTemplateSelect={stableOnTemplateSelect}
        />
      )}

      {/* 2. Content Creator (Kreator Konten) section placed under Pilihan Utama */}
      {contentCreatorTemplates.length > 0 && (
        <CategorySection
          category="Content Creator"
          templates={contentCreatorTemplates}
          onCategorySelect={stableOnCategorySelect}
          onTemplateSelect={stableOnTemplateSelect}
        />
      )}

      {/* 3. Remaining categories */}
      {otherCategories.map((category) => {
        const categoryTemplates = templatesByCategory[category];

        return (
          <LazyCategorySection
            key={category}
            category={category}
            templates={categoryTemplates}
            onCategorySelect={stableOnCategorySelect}
            onTemplateSelect={stableOnTemplateSelect}
          />
        );
      })}
    </div>
  );
};
