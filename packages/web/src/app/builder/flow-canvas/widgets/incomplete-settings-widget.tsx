import {
  FlowAction,
  FlowTriggerType,
  FlowVersion,
  Step,
  flowStructureUtil,
} from '@activepieces/shared';
import { useReactFlow } from '@xyflow/react';
import { t } from 'i18next';
import React, { useMemo } from 'react';

import { BuilderState } from '@/app/builder/builder-hooks';
import { Button } from '@/components/ui/button';

import { flowCanvasUtils } from '../utils/flow-canvas-utils';

type IncompleteSettingsButtonProps = {
  flowVersion: FlowVersion;
  selectStepByName: BuilderState['selectStepByName'];
  setOpenedPieceSelectorStepNameOrAddButtonId: BuilderState['setOpenedPieceSelectorStepNameOrAddButtonId'];
};

const IncompleteSettingsButton: React.FC<IncompleteSettingsButtonProps> = ({
  flowVersion,
  selectStepByName,
  setOpenedPieceSelectorStepNameOrAddButtonId,
}) => {
  const invalidSteps = useMemo(
    () =>
      flowStructureUtil
        .getAllSteps(flowVersion.trigger)
        .filter(filterValidOrSkippedSteps).length,
    [flowVersion],
  );
  const { fitView } = useReactFlow();
  function onClick() {
    const invalidSteps = flowStructureUtil
      .getAllSteps(flowVersion.trigger)
      .filter(filterValidOrSkippedSteps);
    if (invalidSteps.length > 0) {
      const stepToFocus = invalidSteps[0];
      selectStepByName(stepToFocus.name);
      if (stepToFocus.type === FlowTriggerType.EMPTY) {
        setOpenedPieceSelectorStepNameOrAddButtonId(stepToFocus.name);
      }
      fitView(flowCanvasUtils.createFocusStepInGraphParams(stepToFocus.name));
    }
  }
  return (
    !flowVersion.valid && (
      <Button
        variant="ghost"
        className="h-[28px] px-2.5 py-1 bg-warning-500/15 border border-solid border-warning-500/40 text-warning-700 dark:text-warning-300 hover:bg-warning-500/25 hover:border-warning-500/60 hover:text-warning-800 dark:hover:text-warning-200 font-medium text-xs rounded-md shadow-xs animate-fade transition-colors"
        key={'complete-flow-button'}
        onClick={(e) => {
          onClick();
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        {t('incompleteSteps', { invalidSteps: invalidSteps })}
      </Button>
    )
  );
};

IncompleteSettingsButton.displayName = 'IncompleteSettingsButton';
export default IncompleteSettingsButton;
function filterValidOrSkippedSteps(step: Step) {
  if ((step as FlowAction).skip) return false;
  return !step.valid;
}
