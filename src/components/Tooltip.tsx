import React, { useState, useRef } from 'react';
import { useTooltips } from '../context/TooltipContext';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = '',
  delay = 150,
}) => {
  const { tooltipsEnabled } = useTooltips();
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<any>(null);

  if (!tooltipsEnabled || !content) {
    return <>{children}</>;
  }

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-1.5';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-1.5';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-1.5';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-1.5';
    }
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute ${getPositionClasses()} z-50 px-2.5 py-1 text-[11px] leading-tight text-white bg-neutral-900/95 border border-neutral-700/80 rounded-md shadow-xl whitespace-normal max-w-xs pointer-events-none transition-opacity duration-150 animate-in fade-in zoom-in-95`}
          style={{ width: 'max-content', maxWidth: '240px' }}
        >
          {content}
        </div>
      )}
    </div>
  );
};
