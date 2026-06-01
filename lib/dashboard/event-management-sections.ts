import type { LucideIcon } from "lucide-react";
import {
  Camera,
  Image,
  LayoutDashboard,
  QrCode,
  Settings,
} from "lucide-react";

export const EVENT_MANAGEMENT_SECTIONS = [
  {
    id: "overview",
    label: "Visão geral",
    shortLabel: "Visão",
    icon: LayoutDashboard,
  },
  {
    id: "media",
    label: "Mídias",
    shortLabel: "Mídias",
    icon: Image,
  },
  {
    id: "cabine",
    label: "Cabine virtual",
    shortLabel: "Cabine",
    icon: Camera,
  },
  {
    id: "settings",
    label: "Configurações",
    shortLabel: "Config.",
    icon: Settings,
  },
  {
    id: "qr",
    label: "QR Code",
    shortLabel: "QR",
    icon: QrCode,
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}>;

export type EventManagementSectionId =
  (typeof EVENT_MANAGEMENT_SECTIONS)[number]["id"];

export const DEFAULT_EVENT_MANAGEMENT_SECTION: EventManagementSectionId =
  "overview";

export function parseEventManagementSection(
  value: string | null | undefined,
): EventManagementSectionId {
  if (
    value &&
    EVENT_MANAGEMENT_SECTIONS.some((section) => section.id === value)
  ) {
    return value as EventManagementSectionId;
  }

  return DEFAULT_EVENT_MANAGEMENT_SECTION;
}
