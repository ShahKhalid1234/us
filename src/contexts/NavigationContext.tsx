import React, { createContext, useContext, useEffect, useState } from 'react';

interface NavigationContextType {
  currentPath: string;
  path: string;
  params: Record<string, string>;
  navigateTo: (path: string) => void;
  matchRoute: (pattern: RegExp) => boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Helper to parse path parameters based on matching templates
const parseParams = (pattern: string, path: string): Record<string, string> => {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  const params: Record<string, string> = {};

  if (patternParts.length !== pathParts.length) return {};

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      const paramName = patternParts[i].slice(1);
      params[paramName] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return {};
    }
  }

  return params;
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Resolve active params by matching current path against supported route templates
  const resolveParams = (): Record<string, string> => {
    const templates = [
      '/chat/:conversationId',
      '/profile/:username',
      '/love-space/:friendId',
      '/memories/:friendId'
    ];

    for (const template of templates) {
      const parsed = parseParams(template, currentPath);
      if (Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
    return {};
  };

  const matchRoute = (pattern: RegExp) => {
    return pattern.test(currentPath);
  };

  return (
    <NavigationContext.Provider value={{ currentPath, path: currentPath, params: resolveParams(), navigateTo, matchRoute }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
