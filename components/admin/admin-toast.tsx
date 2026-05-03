"use client";

export type AdminToastState = {
  tone: "success" | "error";
  message: string;
} | null;

export function AdminToast({ toast }: { toast: AdminToastState }) {
  if (!toast) {
    return null;
  }

  const isSuccess = toast.tone === "success";

  return (
    <div
      role="status"
      className={`animate-rise fixed bottom-8 left-1/2 z-[140] max-w-[min(92vw,24rem)] -translate-x-1/2 rounded-2xl border px-6 py-4 text-center text-base font-semibold shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl ${
        isSuccess
          ? "border-emerald-400/35 bg-emerald-950/88 text-emerald-50"
          : "border-red-400/35 bg-red-950/88 text-red-50"
      }`}
    >
      {toast.message}
    </div>
  );
}
