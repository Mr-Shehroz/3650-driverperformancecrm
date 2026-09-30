import { requireRole } from "@/lib/auth/session";
import { AccountView } from "@/components/account/account-view";

export const metadata = { title: "My profile" };

export default async function AdminProfilePage() {
  const user = await requireRole("admin");
  return <AccountView user={user} />;
}
