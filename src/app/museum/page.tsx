import { Suspense } from "react";
import type { Metadata } from "next";
import { MuseumShell } from "@/features/living-museum/shell/MuseumShell";

export const metadata: Metadata = {
  title: "Living Museum | Hermes3D",
  description: "A spatial archive of original worlds, process and verified evolution.",
};

export default function MuseumPage() {
  return <Suspense fallback={<div className="min-h-[100dvh] bg-[#0d1112]" aria-label="Preparing the museum" />}><MuseumShell /></Suspense>;
}
