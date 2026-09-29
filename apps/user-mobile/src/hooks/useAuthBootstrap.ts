import { useEffect } from "react";

import { bootstrapAuth } from "@/services/auth/auth-bootstrap";

export function useAuthBootstrap(): void {
  useEffect(() => {
    void bootstrapAuth();
  }, []);
}
