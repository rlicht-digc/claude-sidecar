import { useCallback, useRef, useEffect, useState } from 'react';

interface ResizeHandleProps {
  side: 'left' | 'right';
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  onResize: (width: number) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ResizeHandle({ side, initialWidth, minWidth, maxWidth, onResize, collapsed, onToggleCollapse }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(initialWidth);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = initialWidth;
  }, [initialWidth]);

  const handleDoubleClick = useCallback(() => {
    if (onToggleCollapse) {
      onToggleCollapse();
    }
  }, [onToggleCollapse]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = side === 'left'
        ? e.clientX - startXRef.current
        : startXRef.current - e.clientX;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, side, minWidth, maxWidth, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{
        width: 6,
        cursor: 'col-resize',
        background: isDragging ? '#58a6ff40' : 'transparent',
        borderLeft: side === 'right' ? '1px solid #21262d' : undefined,
        borderRight: side === 'left' ? '1px solid #21262d' : undefined,
        transition: isDragging ? 'none' : 'background 0.15s ease',
        flexShrink: 0,
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) e.currentTarget.style.background = '#58a6ff20';
      }}
      onMouseLeave={(e) => {
        if (!isDragging) e.currentTarget.style.background = 'transparent';
      }}
      title="Drag to resize, double-click to collapse"
    >
      {/* Visual grip indicator */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 2,
        height: 24,
        borderRadius: 1,
        background: isDragging ? '#58a6ff' : '#30363d',
        transition: isDragging ? 'none' : 'background 0.15s ease',
      }} />
    </div>
  );
}
