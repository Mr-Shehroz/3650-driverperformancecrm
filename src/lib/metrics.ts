import type { DriverMetrics, RepMetrics } from "@/types";

const pct = (a: number, b: number) => (b === 0 ? 0 : a / b);

export function driverTotals(rows: DriverMetrics[]) {
  const jobs = rows.reduce((s, r) => s + r.jobs, 0);
  const damageCount = rows.reduce((s, r) => s + r.damageCount, 0);
  const damageCost = rows.reduce((s, r) => s + r.damageCost, 0);
  const reviewCount = rows.reduce((s, r) => s + r.reviewCount, 0);
  const starSum = rows.reduce((s, r) => s + r.avgStars * r.reviewCount, 0);
  const fiveStars = rows.reduce(
    (s, r) => s + r.fiveStarRate * r.reviewCount,
    0,
  );
  const upsellTotal = rows.reduce((s, r) => s + r.upsellTotal, 0);

  return {
    jobs,
    damageCount,
    damageCost,
    damageRate: pct(damageCount, jobs),
    reviewCount,
    avgStars: reviewCount ? starSum / reviewCount : 0,
    fiveStarRate: pct(fiveStars, reviewCount),
    upsellTotal,
    upsellAvg: pct(upsellTotal, jobs),
  };
}

export function repTotals(rows: RepMetrics[]) {
  const leads = rows.reduce((s, r) => s + r.leads, 0);
  const booked = rows.reduce((s, r) => s + r.booked, 0);
  const totalLeadCost = rows.reduce((s, r) => s + r.totalLeadCost, 0);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  return {
    leads,
    booked,
    totalLeadCost,
    revenue,
    closingRatio: pct(booked, leads),
    cpa: pct(totalLeadCost, booked),
  };
}

export type RankRow = { id: string; name: string; value: string; sub?: string };

export function topReviews(rows: DriverMetrics[], n = 5): RankRow[] {
  return rows
    .filter((r) => r.reviewCount > 0)
    .sort((a, b) => b.reviewCount - a.reviewCount || b.avgStars - a.avgStars)
    .slice(0, n)
    .map((r) => ({
      id: r.driverId,
      name: r.driverName,
      value: `${r.reviewCount}`,
      sub: `${r.avgStars.toFixed(1)} avg`,
    }));
}

export function topUpsells(
  rows: DriverMetrics[],
  n = 5,
  fmt: (v: number) => string,
): RankRow[] {
  return rows
    .filter((r) => r.upsellTotal > 0)
    .sort((a, b) => b.upsellTotal - a.upsellTotal)
    .slice(0, n)
    .map((r) => ({
      id: r.driverId,
      name: r.driverName,
      value: fmt(r.upsellTotal),
      sub: `${fmt(Math.round(r.upsellAvg))}/job`,
    }));
}

export function lowestDamage(rows: DriverMetrics[], n = 5): RankRow[] {
  return rows
    .filter((r) => r.jobs > 0)
    .sort((a, b) => a.damageRate - b.damageRate || b.jobs - a.jobs)
    .slice(0, n)
    .map((r) => ({
      id: r.driverId,
      name: r.driverName,
      value: `${Math.round(r.damageRate * 100)}%`,
      sub: `${r.jobs} job${r.jobs === 1 ? "" : "s"}`,
    }));
}
