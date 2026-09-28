import { AppProviders } from "@/components/AppProviders";
import { AppShell } from "@/components/AppShell";
import { MobileGate } from "@/components/MobileGate";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

export default function Home() {
  return (
    <AppErrorBoundary>
      <MobileGate>
        <AppProviders>
          <AppShell />
        </AppProviders>
      </MobileGate>
    </AppErrorBoundary>
  );
}
