import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServiceRoleSupabaseResult } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type EventRow = {
  id: string;
  slug: string;
  name: string;
  owner_user_id: string | null;
  created_at: string | null;
};

type MediaRow = {
  id: string;
  event_id: string | null;
  owner_user_id: string | null;
  created_at: string | null;
  uploaded_at: string | null;
  file_size_bytes?: number | string | null;
};

export type AdminUserSummary = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string | null;
  eventCount: number;
  mediaCount: number;
  storageBytes: number;
  lastUploadAt: string | null;
};

export type AdminOverview = {
  totalUsers: number;
  totalEvents: number;
  totalMedia: number;
  storageBytes: number;
  storageSizeAvailable: boolean;
  users: AdminUserSummary[];
};

export type AdminUserEventSummary = {
  id: string;
  slug: string;
  name: string;
  createdAt: string | null;
  mediaCount: number;
  storageBytes: number;
  lastUploadAt: string | null;
};

export type AdminUserDetail = {
  user: AdminUserSummary;
  events: AdminUserEventSummary[];
  storageSizeAvailable: boolean;
};

function requireServiceClient() {
  const outcome = createServiceRoleSupabaseResult();

  if (!outcome.ok) {
    throw new Error(outcome.reason);
  }

  return outcome.client;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function newestDate(current: string | null, candidate: string | null): string | null {
  if (!candidate) {
    return current;
  }

  if (!current) {
    return candidate;
  }

  return Date.parse(candidate) > Date.parse(current) ? candidate : current;
}

function mediaUploadedAt(row: MediaRow): string | null {
  return row.uploaded_at ?? row.created_at ?? null;
}

async function listAuthUsers(client: ReturnType<typeof requireServiceClient>) {
  const perPage = 1000;
  const users: User[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const chunk = data.users ?? [];
    users.push(...chunk);

    if (chunk.length < perPage) {
      break;
    }
  }

  return users;
}

async function loadProfiles(client: ReturnType<typeof requireServiceClient>) {
  const { data, error } = await client
    .from("profiles")
    .select("id,email,name,role,status,created_at,updated_at");

  if (error) {
    throw new Error(
      "Não foi possível ler public.profiles. Execute o SQL da Fase 1 no Supabase.",
    );
  }

  return (data ?? []) as ProfileRow[];
}

async function loadEvents(client: ReturnType<typeof requireServiceClient>) {
  const { data, error } = await client
    .from("events")
    .select("id,slug,name,owner_user_id,created_at");

  if (error) {
    throw error;
  }

  return (data ?? []) as EventRow[];
}

async function loadMedia(client: ReturnType<typeof requireServiceClient>) {
  const withSize = await client
    .from("media")
    .select("id,event_id,owner_user_id,created_at,uploaded_at,file_size_bytes");

  if (!withSize.error) {
    return {
      rows: (withSize.data ?? []) as MediaRow[],
      storageSizeAvailable: true,
    };
  }

  const withoutSize = await client
    .from("media")
    .select("id,event_id,owner_user_id,created_at,uploaded_at");

  if (withoutSize.error) {
    throw withoutSize.error;
  }

  return {
    rows: (withoutSize.data ?? []) as MediaRow[],
    storageSizeAvailable: false,
  };
}

function buildUserSummaries({
  users,
  profiles,
  events,
  media,
}: {
  users: User[];
  profiles: ProfileRow[];
  events: EventRow[];
  media: MediaRow[];
}): AdminUserSummary[] {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const eventById = new Map(events.map((event) => [event.id, event]));
  const allUserIds = new Set<string>();

  for (const user of users) {
    allUserIds.add(user.id);
  }

  for (const profile of profiles) {
    allUserIds.add(profile.id);
  }

  const summaryById = new Map<string, AdminUserSummary>();

  for (const id of allUserIds) {
    const authUser = users.find((user) => user.id === id);
    const profile = profileById.get(id);
    const email = profile?.email || authUser?.email || authUser?.id || id;

    summaryById.set(id, {
      id,
      email,
      name: profile?.name ?? null,
      role: profile?.role || "customer",
      status: profile?.status || "active",
      createdAt: authUser?.created_at ?? profile?.created_at ?? null,
      eventCount: 0,
      mediaCount: 0,
      storageBytes: 0,
      lastUploadAt: null,
    });
  }

  for (const event of events) {
    const ownerId = event.owner_user_id;

    if (!ownerId) {
      continue;
    }

    const summary = summaryById.get(ownerId);

    if (summary) {
      summary.eventCount += 1;
    }
  }

  for (const item of media) {
    const ownerId = item.owner_user_id ?? eventById.get(item.event_id ?? "")?.owner_user_id;

    if (!ownerId) {
      continue;
    }

    const summary = summaryById.get(ownerId);

    if (!summary) {
      continue;
    }

    summary.mediaCount += 1;
    summary.storageBytes += asNumber(item.file_size_bytes);
    summary.lastUploadAt = newestDate(summary.lastUploadAt, mediaUploadedAt(item));
  }

  return [...summaryById.values()].sort((a, b) =>
    a.email.localeCompare(b.email, "pt-BR"),
  );
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const client = requireServiceClient();
  const [users, profiles, events, mediaResult] = await Promise.all([
    listAuthUsers(client),
    loadProfiles(client),
    loadEvents(client),
    loadMedia(client),
  ]);

  const storageBytes = mediaResult.rows.reduce(
    (sum, row) => sum + asNumber(row.file_size_bytes),
    0,
  );

  return {
    totalUsers: users.length,
    totalEvents: events.length,
    totalMedia: mediaResult.rows.length,
    storageBytes,
    storageSizeAvailable: mediaResult.storageSizeAvailable,
    users: buildUserSummaries({
      users,
      profiles,
      events,
      media: mediaResult.rows,
    }),
  };
}

export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail> {
  const client = requireServiceClient();
  const [users, profiles, events, mediaResult] = await Promise.all([
    listAuthUsers(client),
    loadProfiles(client),
    loadEvents(client),
    loadMedia(client),
  ]);

  const summaries = buildUserSummaries({
    users,
    profiles,
    events,
    media: mediaResult.rows,
  });
  const user = summaries.find((summary) => summary.id === userId);

  if (!user) {
    notFound();
  }

  const ownedEvents = events.filter((event) => event.owner_user_id === userId);
  const eventSummaries = ownedEvents.map((event) => {
    const rows = mediaResult.rows.filter((item) => {
      const resolvedOwner =
        item.owner_user_id ?? events.find((candidate) => candidate.id === item.event_id)?.owner_user_id;

      return item.event_id === event.id && resolvedOwner === userId;
    });

    return {
      id: event.id,
      slug: event.slug,
      name: event.name,
      createdAt: event.created_at,
      mediaCount: rows.length,
      storageBytes: rows.reduce(
        (sum, row) => sum + asNumber(row.file_size_bytes),
        0,
      ),
      lastUploadAt: rows.reduce<string | null>(
        (last, row) => newestDate(last, mediaUploadedAt(row)),
        null,
      ),
    };
  });

  return {
    user,
    events: eventSummaries.sort(
      (a, b) =>
        Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""),
    ),
    storageSizeAvailable: mediaResult.storageSizeAvailable,
  };
}
