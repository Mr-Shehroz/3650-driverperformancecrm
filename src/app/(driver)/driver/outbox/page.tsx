import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { OutboxView } from "@/components/offline/outbox-view";

export const metadata = { title: "Sync queue" };

export default async function OutboxPage() {
  await requireRole("driver");
  return (
    <div>
      <PageHeader
        title="Sync queue"
        description="Entries saved on this phone that haven't uploaded yet."
      />
      <OutboxView />
    </div>
  );
}
