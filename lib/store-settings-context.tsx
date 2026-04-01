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
