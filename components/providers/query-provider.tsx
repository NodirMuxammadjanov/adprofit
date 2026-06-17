"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Standart: og'ir integratsiya so'rovlari (meta ad-account/page, crm
          // pipeline, lead-forms) keraksiz qayta tortilmasin. Loyiha almashganda
          // tegishli keshlar ProjectSwitcher'da bekor qilinadi; joriy-loyiha
          // so'rovi esa o'zining qisqa staleTime'iga ega (lib/projects/hooks).
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
