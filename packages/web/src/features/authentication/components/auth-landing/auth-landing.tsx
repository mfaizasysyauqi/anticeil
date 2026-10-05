import { isNil } from '@activepieces/core-utils';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { LoginModal } from '@/components/custom/login-modal';
import { authenticationSession } from '@/lib/authentication-session';
import { useRedirectAfterLogin } from '@/lib/navigation-utils';

import { AuthBackdrop } from './auth-backdrop';

export function AuthLanding({ initialMode = 'signin' }: AuthLandingProps) {
  const navigate = useNavigate();
  const redirectAfterLogin = useRedirectAfterLogin();
  const signedIn =
    !isNil(authenticationSession.getToken()) &&
    !authenticationSession.isOnboarding();

  useEffect(() => {
    if (signedIn) {
      redirectAfterLogin();
    }
  }, [signedIn, redirectAfterLogin]);

  if (signedIn) {
    return null;
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <AuthBackdrop />
      <LoginModal
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            navigate('/templates');
          }
        }}
      />
    </div>
  );
}

type AuthLandingProps = {
  initialMode?: string;
};

