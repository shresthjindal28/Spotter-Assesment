import { useEffect, useState } from "react";
import { getHealth } from "../lib/api";
export function useBackendHealth() {
  const [status, setStatus] = useState<"checking" | "connected" | "offline">(
    "checking",
  );
  useEffect(() => {
    const controller = new AbortController();
    const check = () =>
      getHealth(controller.signal)
        .then(() => setStatus("connected"))
        .catch(() => {
          if (!controller.signal.aborted) setStatus("offline");
        });
    void check();
    const timer = window.setInterval(check, 60000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  return status;
}
