import React, { createContext, useContext, useState, useEffect } from 'react';

interface TooltipContextType {
  tooltipsEnabled: boolean;
  toggleTooltips: () => void;
  setTooltipsEnabled: (enabled: boolean) => void;
}

const TooltipContext = createContext<TooltipContextType>({
  tooltipsEnabled: true,
  toggleTooltips: () => {},
  setTooltipsEnabled: () => {},
});

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tooltipsEnabled, setTooltipsEnabledState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('axiom_tooltips_enabled');
      return stored !== 'false';
    } catch {
      return true;
    }
  });

  const setTooltipsEnabled = (enabled: boolean) => {
    setTooltipsEnabledState(enabled);
    try {
      localStorage.setItem('axiom_tooltips_enabled', String(enabled));
    } catch {
      // ignore
    }
  };

  const toggleTooltips = () => {
    setTooltipsEnabled(!tooltipsEnabled);
  };

  return (
    <TooltipContext.Provider value={{ tooltipsEnabled, toggleTooltips, setTooltipsEnabled }}>
      {children}
    </TooltipContext.Provider>
  );
};

export const useTooltips = () => useContext(TooltipContext);
