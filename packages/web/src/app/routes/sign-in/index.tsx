import { Navigate, useLocation } from 'react-router-dom';

const SignInPage: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  searchParams.set('login', 'true');
  return <Navigate to={`/templates?${searchParams.toString()}`} replace />;
};

SignInPage.displayName = 'SignInPage';

export { SignInPage };

