import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { COMPANY } from "@/lib/company";
import { formatDate, formatDateTimeET } from "@/lib/format";
import { ACTION_LABELS, diffLines } from "@/lib/audit";
import type { AuditEntry, JobDetail } from "@/types";

const RED = "#d71920";
const BLACK = "#111111";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

const s = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 56,
    paddingHorizontal: 36,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: BLACK,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 3,
    borderBottomColor: RED,
    paddingBottom: 10,
    marginBottom: 16,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logo: {
    width: 36,
    height: 36,
    backgroundColor: RED,
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textAlign: "center",
    paddingTop: 12,
    marginRight: 10,
  },
  company: { fontFamily: "Helvetica-Bold", fontSize: 14 },
  small: { fontSize: 8.5, color: MUTED, marginTop: 2 },
  right: { alignItems: "flex-end" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 17 },
  subtitle: { fontSize: 9, color: MUTED, marginTop: 3, marginBottom: 14 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    marginBottom: 16,
  },
  cell: {
    width: "50%",
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  label: {
    fontSize: 7.5,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  value: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  entry: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    marginBottom: 14,
  },
  entryHead: {
    backgroundColor: BLACK,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  entryHeadText: { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 10 },
  entryHeadMeta: { color: "#d1d5db", fontSize: 8.5 },
  body: { padding: 10 },
  twoCol: { flexDirection: "row", marginBottom: 8 },
  col: { flex: 1, paddingRight: 8 },
  text: { fontSize: 9.5, lineHeight: 1.4 },
  photos: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    marginHorizontal: -3,
  },
  photo: { width: "31.8%", height: 118, objectFit: "cover", margin: 3 },
  ack: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  signature: {
    width: 170,
    height: 58,
    objectFit: "contain",
    marginTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#9ca3af",
  },
  metaLine: { fontSize: 8.5, marginBottom: 3 },
  history: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  historyLine: { fontSize: 8, color: MUTED, marginBottom: 2 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: MUTED,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
});

type Props = {
  job: JobDetail;
  driverName: string;
  crewNames: string;
  audit: AuditEntry[];
  names: Record<string, string>;
  generatedAt: string;
};

export function ClaimsReport({
  job,
  driverName,
  crewNames,
  audit,
  names,
  generatedAt,
}: Props) {
  const entries = job.preDamages.filter((p) => !p.deletedAt);

  return (
    <Document
      title={`Pre-Existing Damage Report — ${job.jobNumber}`}
      author={COMPANY.name}
      subject="Claims defense record"
    >
      <Page size="LETTER" style={s.page}>
        {/* Header (repeats every page) */}
        <View style={s.header} fixed>
          <View style={s.brandRow}>
            <Text style={s.logo}>DRS</Text>
            <View>
              <Text style={s.company}>{COMPANY.name}</Text>
              <Text style={s.small}>
                USDOT #{COMPANY.usdot} · MC #{COMPANY.mc}
              </Text>
            </View>
          </View>
          <View style={s.right}>
            <Text style={s.small}>{COMPANY.address}</Text>
            <Text style={s.small}>{COMPANY.phone}</Text>
            <Text style={s.small}>{COMPANY.email}</Text>
          </View>
        </View>

        <Text style={s.title}>Pre-Existing Damage Report</Text>
        <Text style={s.subtitle}>
          Damage documented at pickup, before loading, and acknowledged by the
          customer.
        </Text>

        {/* Job info */}
        <View style={s.grid}>
          {[
            ["Job number", job.jobNumber],
            ["Job date", formatDate(job.date)],
            ["Origin", `${job.originCity}, ${job.originState}`],
            ["Destination", `${job.destCity}, ${job.destState}`],
            ["Crew", crewNames || driverName],
            ["Recorded by", driverName],
            [
              "Delivered by",
              job.deliveredBy === "partner" ? "Partner crew" : "DRS crew",
            ],
            ["Items documented", String(entries.length)],
          ].map(([label, value]) => (
            <View key={label} style={s.cell}>
              <Text style={s.label}>{label}</Text>
              <Text style={s.value}>{value}</Text>
            </View>
          ))}
        </View>

        {entries.length === 0 && (
          <Text>No pre-existing damage was recorded for this job.</Text>
        )}

        {entries.map((p, i) => {
          const history = audit
            .filter((a) => a.entityId === p.id && a.action === "update")
            .sort((a, b) => a.changedAt.localeCompare(b.changedAt));

          return (
            <View key={p.id} style={s.entry} wrap={false}>
              <View style={s.entryHead}>
                <Text style={s.entryHeadText}>
                  Item {i + 1} of {entries.length}: {p.item}
                </Text>
                <Text style={s.entryHeadMeta}>Record ID {p.id} · Locked</Text>
              </View>

              <View style={s.body}>
                <View style={s.twoCol}>
                  <View style={s.col}>
                    <Text style={s.label}>Location on item</Text>
                    <Text style={s.text}>{p.location}</Text>
                  </View>
                  <View style={s.col}>
                    <Text style={s.label}>Damage description</Text>
                    <Text style={s.text}>{p.description}</Text>
                  </View>
                </View>

                {p.notes ? (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={s.label}>Notes</Text>
                    <Text style={s.text}>{p.notes}</Text>
                  </View>
                ) : null}

                <Text style={s.label}>Photos ({p.photos.length})</Text>
                <View style={s.photos}>
                  {p.photos.map((src, idx) => (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image key={idx} src={src} style={s.photo} />
                  ))}
                </View>

                <View style={s.ack}>
                  <View style={s.col}>
                    <Text style={s.label}>Customer acknowledgment</Text>
                    <Text style={s.metaLine}>
                      Customer shown damage: {p.customerShown ? "Yes" : "No"}
                    </Text>
                    <Text style={s.metaLine}>
                      Printed name: {p.customerName}
                    </Text>
                    {p.signatureUrl ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <Image src={p.signatureUrl} style={s.signature} />
                    ) : (
                      <Text style={s.metaLine}>No signature captured</Text>
                    )}
                  </View>
                  <View style={s.col}>
                    <Text style={s.label}>Record details</Text>
                    <Text style={s.metaLine}>
                      Captured on device: {formatDateTimeET(p.capturedAtDevice)}
                    </Text>
                    <Text style={s.metaLine}>
                      Received by server: {formatDateTimeET(p.receivedAtServer)}
                    </Text>
                    <Text style={s.metaLine}>
                      GPS:{" "}
                      {p.lat !== null && p.lng !== null
                        ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`
                        : "Not available"}
                    </Text>
                    <Text style={s.metaLine}>
                      Saved offline:{" "}
                      {p.syncedOffline
                        ? "Yes (uploaded when signal returned)"
                        : "No"}
                    </Text>
                  </View>
                </View>

                {history.length > 0 && (
                  <View style={s.history}>
                    <Text style={s.label}>
                      Record history (original values preserved)
                    </Text>
                    {history.map((h) => (
                      <Text key={h.id} style={s.historyLine}>
                        {formatDateTimeET(h.changedAt)} —{" "}
                        {ACTION_LABELS[h.action]} by{" "}
                        {names[h.changedBy] ?? "admin"}
                        {h.reason ? ` (reason: ${h.reason})` : ""}:{" "}
                        {diffLines(h.before, h.after)
                          .map((d) => `${d.field} "${d.from}" → "${d.to}"`)
                          .join("; ")}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Footer (repeats every page) */}
        <View style={s.footer} fixed>
          <Text>
            Report generated from the {COMPANY.name} Performance Portal on{" "}
            {generatedAt}. Job {job.jobNumber}.
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
