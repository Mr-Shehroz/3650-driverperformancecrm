import { requireRole } from "@/lib/auth/session";
import { AccountView } from "@/components/account/account-view";

export const metadata = { title: "My profile" };

export default async function SalesProfilePage() {
  const user = await requireRole("sales_rep");
  return <AccountView user={user} />;
}
