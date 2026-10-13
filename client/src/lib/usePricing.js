import { useEffect, useState } from "react";
import { api } from "./api";

// The plan cards and pay-as-you-go prices, straight from the server's pricing
// config - the same numbers it enforces - fetched once and shared by every
// component that shows a price, so no page ever hardcodes one.
let cached = null;
let inflight = null;

export function usePricing() {
  const [catalog, setCatalog] = useState(cached);

  useEffect(() => {
    if (cached) return undefined;
    let cancelled = false;
    inflight ||= api
      .getPricing()
      .then((data) => {
        cached = data;
        return data;
      })
      .finally(() => {
        inflight = null;
      });
    inflight.then((data) => !cancelled && setCatalog(data)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return catalog;
}

/** "RWF 20,000" */
export const rwf = (amount) => `RWF ${Number(amount).toLocaleString()}`;
