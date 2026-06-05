import { Camera, Repeat2, Sparkles, Video, type LucideIcon } from "lucide-react";
import {
  isCabineVirtualCaptureEnabled,
  type CabineVirtualCaptureKind,
  type CabineVirtualEventConfig,
} from "@/lib/virtual-booth/event-config";

export type VirtualBoothMenuOption = {
  id: CabineVirtualCaptureKind;
  Icon: LucideIcon;
  title: string;
  description: string;
};

const ALL_MENU_OPTIONS: VirtualBoothMenuOption[] = [
  {
    id: "photo",
    Icon: Camera,
    title: "Foto",
    description: "Tire uma foto personalizada para o evento.",
  },
  {
    id: "boomerang",
    Icon: Repeat2,
    title: "Boomerang",
    description: "Crie um movimento de vai-e-volta para o evento.",
  },
  {
    id: "video",
    Icon: Video,
    title: "Vídeo",
    description: "Grave um vídeo curto para o evento.",
  },
  // Futuro: { id: "ai-photo", Icon: Sparkles, title: "Fotos com IA", description: "..." },
];

/** Reservado para a futura opção “Fotos com IA” (não exposto no menu ainda). */
export const FUTURE_AI_PHOTO_ICON = Sparkles;

export function buildVirtualBoothMenuOptions(
  config: CabineVirtualEventConfig,
): VirtualBoothMenuOption[] {
  return ALL_MENU_OPTIONS.filter((option) =>
    isCabineVirtualCaptureEnabled(config, option.id),
  );
}
