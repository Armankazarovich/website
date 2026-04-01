"use client";

import { createContext, useContext } from "react";

export type CardStyle = "classic" | "showcase" | "vivid" | "minimal" | "magazine";

type StoreSettings = {
  cardStyle: CardStyle;
  photoAspect: string;
};

export const StoreSettingsContext = createContext<StoreSettings>({
  cardStyle: "classic",
  photoAspect: "1/1",
});

export const useStoreSettings = () => useContext(StoreSettingsContext);
