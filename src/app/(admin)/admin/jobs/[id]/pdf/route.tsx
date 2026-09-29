import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth/session";
import { getAuditLog, getJobDetail, getUsers } from "@/lib/data";
import { formatDateTimeET } from "@/lib/format";
import { ClaimsReport } from "@/lib/pdf/claims-report";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.role !== "admin")
    return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const job = await getJobDetail(id);
  if (!job) return new NextResponse("Job not found", { status: 404 });

  const [users, audit] = await Promise.all([
    getUsers(),
    getAuditLog({ jobId: id }),
  ]);
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const crewNames = job.crewIds
    .map((c) => names[c])
    .filter(Boolean)
    .join(", ");

  const buffer = await renderToBuffer(
    <ClaimsReport
      job={job}
      driverName={names[job.driverId] ?? "Unknown"}
      crewNames={crewNames}
      audit={audit}
      names={names}
      generatedAt={formatDateTimeET(new Date().toISOString())}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="DRS-damage-report-${job.jobNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
