import { requireRole } from "@/lib/auth/session";
import { DriverShell } from "@/components/driver/driver-shell";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("driver");
  return <DriverShell user={user}>{children}</DriverShell>;
}
