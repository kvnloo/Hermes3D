"use client";

import { OfficeMuseumOverlay } from "@/features/living-museum/shell/OfficeMuseumOverlay";

export default function MuseumLayoutContractPage() {
  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#11181a] text-white">
      <div aria-label="3D scene contract surface" className="absolute inset-0 bg-[radial-gradient(circle_at_58%_42%,#43504c_0,#202b2b_30%,#11181a_68%)]" />
      <section data-layout-panel="office-left-panels" hidden>Office panels suppressed in annex mode</section>
      <section data-layout-panel="office-event-console" hidden>Event console suppressed in annex mode</section>
      <aside data-layout-panel="office-right-rail" aria-label="Office right rail" className="fixed right-0 top-20 z-20 h-80 w-10 rounded-l-xl border border-white/15 bg-black/70" />
      <button data-layout-panel="office-chat-control" type="button" className="fixed bottom-4 right-4 z-30 h-10 w-24 rounded-full border border-white/20 bg-black/75 text-xs font-semibold tracking-[0.16em]">CHAT</button>
      <OfficeMuseumOverlay activeSlug={null} onSelect={() => {}} onExit={() => {}} />
    </div>
  );
}
