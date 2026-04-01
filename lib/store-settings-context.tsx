"use client";

import { createContext, useContext } from "react";

type StoreSettings = {
  cardStyle: string;
  photoAspect: string;
};

export const StoreSettingsContext = createContext<StoreSettings>({
  cardStyle: "classic",
  photoAspect: "1/1",
});

export const useStoreSettings = () => useContext(StoreSettingsContext);

// ✅ Client Component wrapper — used by Server Component layouts
export function StoreSettingsProvider({
  children,
  cardStyle,
  photoAspect,
}: {
  children: React.ReactNode;
  cardStyle: string;
  photoAspect: string;
}) {
  return (
    <StoreSettingsContext.Provider value={{ cardStyle, photoAspect }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}
