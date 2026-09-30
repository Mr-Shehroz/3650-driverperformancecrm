import { requireRole } from "@/lib/auth/session";
import { AccountView } from "@/components/account/account-view";

export const metadata = { title: "My profile" };

export default async function DriverProfilePage() {
  const user = await requireRole("driver");
  return <AccountView user={user} />;
}
