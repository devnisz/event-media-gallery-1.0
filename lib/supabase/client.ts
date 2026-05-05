"use client";

import { createClient } from "@supabase/supabase-js";

export function createBrowserSupabase() {
  const url = "https://kwchocfrqzdhxthccpnw.supabase.co";
  const anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Y2hvY2ZycXpkaHh0aGNjcG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTQ0MjQsImV4cCI6MjA5MzM5MDQyNH0.nafhZbSx9Zo8HqwSIiI3o7SHDUFd-eMaxCDnZDYrqTc";

  console.log("TESTE FORÇADO SUPABASE", { url, anon });

  return createClient(url, anon);
}