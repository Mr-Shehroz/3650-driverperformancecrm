import { requireRole } from "@/lib/auth/session";
import { SalesShell } from "@/components/sales/sales-shell";

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("sales_rep");
  return <SalesShell user={user}>{children}</SalesShell>;
}
