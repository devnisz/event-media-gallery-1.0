"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/80 transition hover:border-amber-300/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
    >
      Sair
    </button>
  );
}
