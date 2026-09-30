import { requireRole } from "@/lib/auth/session";
import { getSettings, getUsers } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireRole("admin");
  const [settings, users] = await Promise.all([getSettings(), getUsers()]);
  const admins = users
    .filter((u) => u.role === "admin" && u.active)
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Company details and notification preferences."
      />
      <SettingsForm settings={settings} admins={admins} />
    </div>
  );
}
