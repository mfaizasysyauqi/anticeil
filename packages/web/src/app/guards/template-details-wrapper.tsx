import { isNil } from '@activepieces/core-utils';
import { TemplateType } from '@activepieces/shared';
import { Navigate, useParams, useLocation } from 'react-router-dom';

import { PageTitle } from '@/app/components/page-title';
import { ProjectDashboardLayout } from '@/app/components/project-layout';
import { TemplateDetailsPage } from '@/app/routes/templates/id';
import { CONTENT_CREATOR_TEMPLATES } from '@/app/routes/templates/content-creator-templates';
import { LoadingScreen } from '@/components/custom/loading-screen';
import { ShareTemplate, templatesHooks } from '@/features/templates';
import { authenticationSession } from '@/lib/authentication-session';
import { FROM_QUERY_PARAM } from '@/lib/navigation-utils';

const TemplateDetailsWrapper = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const location = useLocation();

  // Check local templates first — no API call needed
  const localTemplate = CONTENT_CREATOR_TEMPLATES.find((t) => t.id === templateId);

  const { data: apiTemplate, isLoading } = templatesHooks.useTemplate(
    localTemplate ? undefined as unknown as string : templateId!,
  );


  const template = localTemplate ?? apiTemplate;

  if (!localTemplate && isLoading) {
    return <LoadingScreen />;
  }

  if (!template) {
    return <Navigate to="/templates" replace />;
  }

  const useProjectLayout = template.type !== TemplateType.SHARED;

  const content = (
    <PageTitle title={template.name}>
      <TemplateDetailsPage template={template} />
    </PageTitle>
  );

  if (useProjectLayout) {
    return <ProjectDashboardLayout>{content}</ProjectDashboardLayout>;
  }

  return <ShareTemplate template={template} />;
};

export { TemplateDetailsWrapper };
