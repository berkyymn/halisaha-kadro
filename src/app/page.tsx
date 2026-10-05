import { AppProviders } from "@/components/AppProviders";
import { AppShell } from "@/components/AppShell";
import { LayoutModeGate } from "@/components/LayoutModeGate";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

export default function Home() {
  return (
    <AppErrorBoundary>
      <LayoutModeGate>
        <AppProviders>
          <AppShell />
        </AppProviders>
      </LayoutModeGate>
    </AppErrorBoundary>
  );
}
