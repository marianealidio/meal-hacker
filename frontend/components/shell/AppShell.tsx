"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AssistantPanel } from "@/components/features/assistant/AssistantPanel";
import { useStats } from "@/lib/queries";
import type { Me } from "@/lib/types";
import { AppHeader } from "./AppHeader";
import { BottomTabs } from "./BottomTabs";
import { Sidebar } from "./Sidebar";

export function AppShell({ me, children }: { me: Me; children: ReactNode }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const stats = useStats();

  useEffect(() => {
    document.body.setAttribute("data-app-shell", "");
    return () => document.body.removeAttribute("data-app-shell");
  }, []);

  return (
    <div className="min-h-dvh bg-cream">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-cream focus:px-4 focus:py-2 focus:text-sage-deep focus:shadow-lift"
      >
        Skip to content
      </a>
      <Sidebar me={me} stat={stats.data?.used_this_month ?? null} />
      <div data-print="flush" className="lg:pl-[248px]">
        <AppHeader me={me} onAssistant={() => setAssistantOpen(true)} />
        <main id="main" data-print="flush" tabIndex={-1} className="px-4 pb-28 focus:outline-none sm:px-6 lg:px-10 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomTabs />
      <AssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />
    </div>
  );
}
