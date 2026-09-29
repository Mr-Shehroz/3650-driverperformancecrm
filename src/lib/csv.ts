type Cell = string | number | null | undefined;

export function toCsv(headers: string[], rows: Cell[][]) {
  const esc = (v: Cell) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM so Excel opens UTF-8 correctly
  return (
    "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n")
  );
}
