import type { Metadata } from "next";
import { MobileAgentGame } from "@/features/mobile-game/MobileAgentGame";

export const metadata: Metadata = {
  title: "Settlement prototype · Hermes3D",
  description: "A private synthetic-evidence prototype for truthful agent and task management.",
};

export default async function MobileAgentGamePage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const query = await searchParams;
  return <MobileAgentGame stale={query.source === "stale"} />;
}
