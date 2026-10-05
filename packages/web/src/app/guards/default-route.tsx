import { isNil } from '@activepieces/core-utils';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthorization } from '@/hooks/authorization-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import {
  determineDefaultRoute,
  TRIAL_KEY_QUERY_PARAM,
} from '@/lib/route-utils';

import { NoProjectsState } from '../components/no-projects-state';
import { ProjectDashboardLayout } from '../components/project-layout';

export const DefaultRoute = () => {
  const token = authenticationSession.getToken();
  if (!token) {
    // Guest → explore templates first, login modal appears on action
    return <Navigate to="/templates" replace />;
  }
  if (authenticationSession.isOnboarding()) {
    return <Navigate to="/create-platform" replace />;
  }
  return <AuthenticatedDefaultRoute />;
};

const AuthenticatedDefaultRoute = () => {
  const { checkAccess } = useAuthorization();
  const { platform } = platformHooks.useCurrentPlatform();
  const location = useLocation();
  const currentProjectId = authenticationSession.getProjectId();
  const trialKey = new URLSearchParams(location.search).get(
    TRIAL_KEY_QUERY_PARAM,
  );
  if (isNil(currentProjectId)) {
    return (
      <ProjectDashboardLayout>
        <NoProjectsState />
      </ProjectDashboardLayout>
    );
  }
  return (
    <Navigate
      to={{
        pathname: determineDefaultRoute({
          checkAccess,
          chatEnabled: platform.plan.chatEnabled,
        }),
        search: isNil(trialKey)
          ? ''
          : new URLSearchParams({
              [TRIAL_KEY_QUERY_PARAM]: trialKey,
            }).toString(),
      }}
      replace
    ></Navigate>
  );
};
