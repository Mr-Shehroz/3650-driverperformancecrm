// File: src/lib/evidence/paths.ts
// (REPLACE the whole file)

/** Private Supabase Storage bucket for job evidence (photos, signatures, review screenshots) */
export const EVIDENCE_BUCKET = "evidence";

export type EvidenceKind = "pre_damage" | "damage" | "review";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_RE = new RegExp(
  `^(${UUID})/(pre_damage|damage|review)/[A-Za-z0-9._-]{1,120}\\.(jpg|png)$`,
);

/** Storage path: <job_id>/<kind>/<file>. The job id folder is what Storage security checks. */
export function evidencePath(jobId: string, kind: EvidenceKind, file: string) {
  return `${jobId}/${kind}/${file}`;
}

/** True if the path is a valid evidence path that belongs to this job */
export function isEvidencePathFor(
  path: string,
  jobId: string,
  kind: EvidenceKind,
) {
  const m = PATH_RE.exec(path);
  return !!m && m[1] === jobId.toLowerCase() && m[2] === kind;
}

/* ---------- Fleet files (pre-trip photos/signatures, roadside reports) ---------- */
/** Private bucket: pre_trip/<user_id>/<file> and roadside/<user_id>/<file> */
export const FLEET_BUCKET = "fleet";

export type FleetKind = "pre_trip" | "roadside";

const FLEET_RE = new RegExp(
  `^(pre_trip|roadside)/(${UUID})/[A-Za-z0-9._-]{1,120}\\.(jpg|png|pdf)$`,
);

export function fleetPath(kind: FleetKind, userId: string, file: string) {
  return `${kind}/${userId}/${file}`;
}

/** True if the path is a valid fleet path uploaded by this user */
export function isFleetPathFor(path: string, kind: FleetKind, userId: string) {
  const m = FLEET_RE.exec(path);
  return !!m && m[1] === kind && m[2] === userId.toLowerCase();
}
