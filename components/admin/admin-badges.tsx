type BadgeTone = "amber" | "emerald" | "rose" | "slate" | "violet";

const toneClass: Record<BadgeTone, string> = {
  amber: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  emerald: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  rose: "border-rose-300/30 bg-rose-300/10 text-rose-100",
  slate: "border-white/15 bg-white/[0.06] text-white/70",
  violet: "border-violet-300/30 bg-violet-300/10 text-violet-100",
};

function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${toneClass[tone]}`}
    >
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const tone: BadgeTone =
    role === "master_admin"
      ? "amber"
      : role === "operator"
        ? "violet"
        : "slate";

  return <Badge label={role} tone={tone} />;
}

export function StatusBadge({ status }: { status: string }) {
  const tone: BadgeTone = status === "suspended" ? "rose" : "emerald";

  return <Badge label={status} tone={tone} />;
}
