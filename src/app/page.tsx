import { AppProviders } from "@/components/AppProviders";
import { AppShell } from "@/components/AppShell";
import { MobileGate } from "@/components/MobileGate";

export default function Home() {
  return (
    <MobileGate>
      <AppProviders>
        <AppShell />
      </AppProviders>
    </MobileGate>
  );
}
