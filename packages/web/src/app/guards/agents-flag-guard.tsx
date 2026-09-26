import { Navigate } from 'react-router-dom';

import { useAgentsAvailable } from '@/features/agents';

type AgentsFlagGuardProps = {
  children: React.ReactNode;
};

export const AgentsFlagGuard = ({ children }: AgentsFlagGuardProps) => {
  return <>{children}</>;
};
