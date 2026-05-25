"use client";

export type ArayMetrikaGoal =
  | "aray_order_success"
  | "aray_lead_sent"
  | "aray_phone_click"
  | "aray_messenger_click"
  | "aray_cart_add"
  | "aray_checkout_start"
  | "aray_engaged_session"
  | "product_share"
  | "product_aray_open"
  | "product_request_sent";

type ArayMetrikaPayload = {
  goal: ArayMetrikaGoal;
  params: Record<string, unknown>;
};

declare global {
  interface Window {
    arayMetrikaGoal?: (
      goal: ArayMetrikaGoal,
      params?: Record<string, unknown>,
    ) => void;
    arayMetrikaGoalQueue?: ArayMetrikaPayload[];
  }
}

export function trackArayMetrikaGoal(
  goal: ArayMetrikaGoal,
  params: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;
  if (typeof window.arayMetrikaGoal === "function") {
    window.arayMetrikaGoal(goal, params);
    return;
  }
  window.arayMetrikaGoalQueue = window.arayMetrikaGoalQueue || [];
  window.arayMetrikaGoalQueue.push({ goal, params });
  window.dispatchEvent(
    new CustomEvent("aray:metrika-goal", {
      detail: { goal, params },
    }),
  );
}
