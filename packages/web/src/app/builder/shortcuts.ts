import {
  flowStructureUtil,
  StepLocationRelativeToParent,
} from '@activepieces/shared';
import { useCallback, useEffect } from 'react';

import { isEditableTarget } from '@/lib/dom-utils';

import { useBuilderStateContext } from './builder-hooks';
import { CanvasShortcutsProps } from './flow-canvas/context-menu/canvas-context-menu';
import { canvasBulkActions } from './flow-canvas/utils/bulk-actions';
import { flowCanvasConsts } from './flow-canvas/utils/consts';

export const useHandleKeyPressOnCanvas = () => {
  const [
    selectedNodes,
    flowVersion,
    selectedStep,
    exitStepSettings,
    applyOperation,
    readonly,
    setShowMinimap,
    showMinimap,
    setDraggedNote,
    setDraggedStep,
    undo,
    redo,
  ] = useBuilderStateContext((state) => [
    state.selectedNodes,
    state.flowVersion,
    state.selectedStep,
    state.exitStepSettings,
    state.applyOperation,
    state.readonly,
    state.setShowMinimap,
    state.showMinimap,
    state.setDraggedNote,
    state.setActiveDraggingStep,
    state.undo,
    state.redo,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) {
        return;
      }
      const insideSelectionRect =
        e.target instanceof HTMLElement &&
        e.target.classList.contains(
          flowCanvasConsts.NODE_SELECTION_RECT_CLASS_NAME,
        );
      const insideStep =
        e.target instanceof HTMLElement &&
        e.target.closest(
          `[data-${flowCanvasConsts.STEP_CONTEXT_MENU_ATTRIBUTE}]`,
        );
      const insideBody = e.target === document.body;
      const selectedNodesWithoutTrigger = selectedNodes.filter(
        (node) => node !== flowVersion.trigger.name,
      );

      // Ctrl+Shift+Z = Redo (intercepted before main handler to avoid conflict)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.stopPropagation();
        e.preventDefault();
        if (!readonly) redo();
        return;
      }

      shortcutHandler(e, {
        Minimap: () => {
          setShowMinimap(!showMinimap);
        },
        Copy: () => {
          if (
            selectedNodesWithoutTrigger.length > 0 &&
            document.getSelection()?.toString() === ''
          ) {
            e.stopPropagation();
            e.preventDefault();

            canvasBulkActions.copySelectedNodes({
              selectedNodes: selectedNodesWithoutTrigger,
              flowVersion,
            });
          }
        },
        Delete: () => {
          if (readonly) {
            return;
          }
          if (selectedNodes.length > 0) {
            e.stopPropagation();
            e.preventDefault();
            canvasBulkActions.deleteSelectedNodes({
              exitStepSettings,
              selectedStep,
              selectedNodes,
              applyOperation,
            });
          }
        },
        Skip: () => {
          if (readonly) {
            return;
          }
          if (selectedNodesWithoutTrigger.length > 0) {
            canvasBulkActions.toggleSkipSelectedNodes({
              selectedNodes: selectedNodesWithoutTrigger,
              flowVersion,
              applyOperation,
            });
          }
        },
        ExitDrag: () => {
          setDraggedNote(null, null);
          setDraggedStep(null);
        },
        Undo: () => {
          if (!readonly) undo();
        },
        Redo: () => {
          if (!readonly) redo();
        },
        Paste: () => {
          if (
            readonly ||
            (!insideSelectionRect && !insideStep && !insideBody)
          ) {
            return;
          }
          e.stopPropagation();
          e.preventDefault();
          canvasBulkActions.getActionsInClipboard().then((actions) => {
            if (actions.length > 0) {
              const lastStep = [
                flowVersion.trigger,
                ...flowStructureUtil.getAllNextActionsWithoutChildren(
                  flowVersion.trigger,
                ),
              ].at(-1)!.name;
              const lastSelectedNode =
                selectedNodes.length === 1 ? selectedNodes[0] : null;
              canvasBulkActions.pasteNodes(
                flowVersion,
                {
                  parentStepName: lastSelectedNode ?? lastStep,
                  stepLocationRelativeToParent:
                    StepLocationRelativeToParent.AFTER,
                },
                applyOperation,
              );
            }
          });
        },
      });
    },
    [
      selectedNodes,
      flowVersion,
      applyOperation,
      selectedStep,
      exitStepSettings,
      readonly,
      setShowMinimap,
      showMinimap,
      setDraggedNote,
      setDraggedStep,
      undo,
      redo,
    ],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
const shortcutHandler = (
  event: KeyboardEvent,
  handlers: Record<keyof CanvasShortcutsProps, () => void>,
) => {
  const shortcutActivated = Object.entries(CanvasShortcuts).find(
    ([_, shortcut]) => {
      const keyMatch =
        shortcut.shortcutKey?.toLowerCase() === event.key.toLowerCase() ||
        // Treat Backspace as alias for Delete shortcut
        (shortcut.shortcutKey === 'Delete' && event.key === 'Backspace');
      const ctrlMatch = !!(
        shortcut.withCtrl === event.ctrlKey ||
        shortcut.withCtrl === event.metaKey
      );
      const shiftMatch = !!shortcut.withShift === event.shiftKey;
      return keyMatch && ctrlMatch && shiftMatch;
    },
  );
  if (shortcutActivated) {
    handlers[shortcutActivated[0] as keyof CanvasShortcutsProps]();
  }
};

export const CanvasShortcuts: CanvasShortcutsProps = {
  ExitDrag: {
    withCtrl: false,
    withShift: false,
    shortcutKey: 'Escape',
  },
  Minimap: {
    withCtrl: true,
    withShift: false,
    shortcutKey: 'm',
  },
  Paste: {
    withCtrl: true,
    withShift: false,
    shortcutKey: 'v',
  },
  Delete: {
    withCtrl: false,
    withShift: false,
    shortcutKey: 'Delete',
  },
  Copy: {
    withCtrl: true,
    withShift: false,
    shortcutKey: 'c',
  },
  Skip: {
    withCtrl: true,
    withShift: false,
    shortcutKey: 'e',
  },
  Undo: {
    withCtrl: true,
    withShift: false,
    shortcutKey: 'z',
  },
  Redo: {
    withCtrl: true,
    withShift: false,
    shortcutKey: 'y',
  },
};
