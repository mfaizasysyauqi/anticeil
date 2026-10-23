import { useReactFlow, useViewport } from '@xyflow/react';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { CollaboratorCursor, useRealtimeCursors } from '@/hooks/use-realtime-cursors';

interface RealtimeCanvasCursorsProps {
  resourceId: string;
  selectedStep?: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const RealtimeCanvasCursors = React.memo(
  ({ resourceId, selectedStep, containerRef }: RealtimeCanvasCursorsProps) => {
    const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
    useViewport(); // Subscribes to pan/zoom changes to keep screen positions perfectly synced
    const { cursors, sendCursorPosition } = useRealtimeCursors({
      resourceId,
      selectedStep,
    });

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handlePointerMove = (e: MouseEvent | PointerEvent) => {
        // Calculate canvas graph coordinates taking zoom and pan into account
        const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        sendCursorPosition(pos.x, pos.y);
      };

      const handlePointerLeave = () => {
        sendCursorPosition(null, null);
      };

      container.addEventListener('pointermove', handlePointerMove as EventListener);
      container.addEventListener('mousemove', handlePointerMove as EventListener);
      container.addEventListener('pointerleave', handlePointerLeave);
      container.addEventListener('mouseleave', handlePointerLeave);

      return () => {
        container.removeEventListener('pointermove', handlePointerMove as EventListener);
        container.removeEventListener('mousemove', handlePointerMove as EventListener);
        container.removeEventListener('pointerleave', handlePointerLeave);
        container.removeEventListener('mouseleave', handlePointerLeave);
      };
    }, [containerRef, screenToFlowPosition, sendCursorPosition]);

    if (cursors.length === 0 || typeof document === 'undefined') {
      return null;
    }

    const rect = containerRef.current?.getBoundingClientRect();

    // Render directly into document.body to break out of FlowCanvas stacking context (z-30)
    // so cursors and name badges are permanently above all banners, nodes, and test widgets
    return createPortal(
      <div className="fixed inset-0 pointer-events-none select-none z-[9999999]">
        {cursors.map((cursor) => {
          const screenPos = flowToScreenPosition({ x: cursor.x, y: cursor.y });
          // If the position is scrolled far outside the visible canvas area, don't render it
          if (rect) {
            if (
              screenPos.x < rect.left - 60 ||
              screenPos.x > rect.right + 60 ||
              screenPos.y < rect.top - 60 ||
              screenPos.y > rect.bottom + 60
            ) {
              return null;
            }
          }
          return (
            <CollaboratorCursorItem
              key={cursor.userId}
              cursor={cursor}
              screenX={screenPos.x}
              screenY={screenPos.y}
            />
          );
        })}
      </div>,
      document.body,
    );
  },
);

RealtimeCanvasCursors.displayName = 'RealtimeCanvasCursors';

const CollaboratorCursorItem = ({
  cursor,
  screenX,
  screenY,
}: {
  cursor: CollaboratorCursor;
  screenX: number;
  screenY: number;
}) => {
  return (
    <div
      className="fixed pointer-events-none transition-transform duration-75 ease-out select-none"
      style={{
        transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
        willChange: 'transform',
        zIndex: 9999999,
        left: 0,
        top: 0,
      }}
    >
      {/* Figma-style SVG cursor pointer with color-matching theme */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={cursor.color}
          stroke="#ffffff"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>

      {/* Floating Collaborator Badge Tag */}
      <div
        className="ml-3 -mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-white shadow-2xl whitespace-nowrap border border-white/20"
        style={{
          backgroundColor: cursor.color,
          zIndex: 9999999,
        }}
      >
        <span>{cursor.userDisplayName}</span>
        {cursor.selectedStep && (
          <span className="opacity-90 text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full font-normal">
            {cursor.selectedStep}
          </span>
        )}
      </div>
    </div>
  );
};
