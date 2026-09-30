import { OfflineApp } from "@/components/offline/offline-app";

export const dynamic = "force-static";
export const metadata = { title: "Offline mode", robots: { index: false } };

export default function DriverOfflinePage() {
  return <OfflineApp />;
}
