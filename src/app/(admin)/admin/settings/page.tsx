import { requireRole } from "@/lib/auth/session";
import { getScoring, getSettings, getUsers } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { ScoringForm } from "@/components/fleet/scoring-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireRole("admin");
  const [settings, users, scoring] = await Promise.all([
    getSettings(),
    getUsers(),
    getScoring(),
  ]);
  const admins = users
    .filter((u) => u.role === "admin" && u.active)
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Company details, notifications and driver scoring."
      />
      <SettingsForm settings={settings} admins={admins} />
      <ScoringForm scoring={scoring} />
    </div>
  );
}
