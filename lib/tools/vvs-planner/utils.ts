export function formatNumber(num: number): string {
  if (num >= 100_000_000) return `${(num / 100_000_000).toFixed(1)}억`;
  if (num >= 10_000) return `${(num / 10_000).toFixed(1)}만`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}천`;
  return num.toLocaleString();
}

export function formatVVS(vvs: number): string {
  return vvs.toFixed(2);
}

export function cn(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(" ");
}

export function vvsBadge(vvs: number): {
  bg: string;
  text: string;
  label: string;
} {
  if (vvs >= 5) return { bg: "bg-success/15", text: "text-success", label: "high" };
  if (vvs >= 1) return { bg: "bg-warnSoft", text: "text-warn", label: "mid" };
  return { bg: "bg-chip", text: "text-mute", label: "low" };
}

export function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = parseInt(m[1] ?? "0", 10);
  const mi = parseInt(m[2] ?? "0", 10);
  const s = parseInt(m[3] ?? "0", 10);
  return h * 3600 + mi * 60 + s;
}
