import {
  isCabineVirtualCaptureEnabled,
  type CabineVirtualCaptureKind,
  type CabineVirtualEventConfig,
} from "@/lib/virtual-booth/event-config";

export type VirtualBoothMenuOption = {
  id: CabineVirtualCaptureKind;
  icon: string;
  title: string;
  description: string;
};

const ALL_MENU_OPTIONS: VirtualBoothMenuOption[] = [
  {
    id: "photo",
    icon: "📸",
    title: "Foto",
    description: "Tire uma foto personalizada para o evento.",
  },
  {
    id: "gif",
    icon: "🎞️",
    title: "GIF",
    description: "Crie um GIF divertido para o evento.",
  },
  {
    id: "boomerang",
    icon: "🎞️",
    title: "Boomerang",
    description: "Crie um movimento de vai-e-volta para o evento.",
  },
  // Futuro: { id: "ai-photo", icon: "✨", title: "Fotos com IA", description: "..." },
  {
    id: "video",
    icon: "🎥",
    title: "Vídeo",
    description: "Grave um vídeo curto para o evento.",
  },
];

export function buildVirtualBoothMenuOptions(
  config: CabineVirtualEventConfig,
): VirtualBoothMenuOption[] {
  return ALL_MENU_OPTIONS.filter((option) =>
    isCabineVirtualCaptureEnabled(config, option.id),
  );
}
