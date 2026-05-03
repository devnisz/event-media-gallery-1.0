export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(245,158,11,0.22),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(124,58,237,0.24),transparent_32%),linear-gradient(135deg,#050505_0%,#0d111c_48%,#040506_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      <div className="animate-pulse-glow absolute left-1/2 top-1/3 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />
    </div>
  );
}
