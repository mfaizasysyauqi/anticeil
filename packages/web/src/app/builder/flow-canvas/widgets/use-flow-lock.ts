import { isNil } from '@activepieces/core-utils';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useResourceLock } from '@/hooks/use-resource-lock';

import { useBuilderStateContext } from '../../builder-hooks';
import { flowCanvasHooks } from '../hooks';

// Simultaneous collaborative editing enabled: flow locking is disabled so collaborators
// can edit in parallel without turn-based locks or 'take over' barriers.
function useFlowLock() {
  const [flowId] = useBuilderStateContext((state) => [
    state.flow.id,
  ]);
  const run = useBuilderStateContext((state) => state.run);
  const navigate = useNavigate();
  const { switchToDraft } = flowCanvasHooks.useSwitchToDraft();

  const onTakeOver = useCallback(() => {
    if (!isNil(run)) {
      navigate(`/flows/${flowId}`);
    } else {
      switchToDraft();
    }
  }, [run, navigate, flowId, switchToDraft]);

  const { takeOver } = useResourceLock({
    resourceId: flowId,
    onTakeOver,
  });

  return { lockedBy: null, takeOver };
}

export { useFlowLock };
