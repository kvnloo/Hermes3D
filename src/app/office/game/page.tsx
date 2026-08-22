import type { Metadata } from "next";
import { MobileAgentGame } from "@/features/mobile-game/MobileAgentGame";

export const metadata: Metadata = {
  title: "Settlement prototype · Hermes3D",
  description: "A private synthetic-evidence prototype for truthful agent and task management.",
};

export default function MobileAgentGamePage() {
  return <MobileAgentGame />;
}
