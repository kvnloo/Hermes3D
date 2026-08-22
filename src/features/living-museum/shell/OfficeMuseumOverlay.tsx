"use client";

import type { MuseumExhibitSlug } from "../core/MuseumExhibitV1";
import { museumOfficeHref } from "../core/MuseumRuntimeV1";
import { museumSearchCorpus, validatedMuseumExhibits } from "../registry";
import { MuseumSearch } from "./MuseumSearch";
import "./museum.css";

export function OfficeMuseumOverlay({ activeSlug, onSelect, onExit }: { activeSlug: MuseumExhibitSlug | null; onSelect: (slug: MuseumExhibitSlug | null) => void; onExit: () => void }) {
  const active = validatedMuseumExhibits.find(({ manifest }) => manifest.slug === activeSlug)?.manifest;
  const navigate = (slug: MuseumExhibitSlug | null) => {
    window.history.pushState({}, "", museumOfficeHref(slug));
    onSelect(slug);
  };
  return (
    <aside className="pointer-events-none absolute inset-0 z-30 text-white" aria-label="Living Museum gallery">
      <header className="pointer-events-auto absolute left-4 right-4 top-4 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#0d1112]/85 px-4 py-3 shadow-2xl backdrop-blur-xl md:left-8 md:right-8">
        <button type="button" className="text-left" onClick={() => navigate(null)}><span className="block text-[10px] uppercase tracking-[0.28em] text-amber-300">Hermes3D Office Annex</span><strong>Living Museum</strong></button>
        <div className="flex items-center gap-2"><MuseumSearch records={museumSearchCorpus} /><button type="button" onClick={onExit} className="rounded-full border border-white/20 px-3 py-2 text-xs">Return to office</button></div>
      </header>
      <section className="pointer-events-auto absolute bottom-5 left-4 right-4 max-w-xl rounded-2xl border border-white/15 bg-[#0d1112]/88 p-5 shadow-2xl backdrop-blur-xl md:bottom-8 md:left-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-amber-300">{active ? "Active exhibit" : "Gallery arrival"}</p>
        <h1 className="mt-1 text-2xl font-semibold md:text-4xl">{active?.title ?? "Worlds become legible through artifacts."}</h1>
        <p className="mt-2 text-sm text-white/75">{active?.oneLineIntent ?? "Choose an exhibit. The office renderer and camera remain in control."}</p>
        <div className="mt-4 flex max-h-24 flex-wrap gap-2 overflow-auto">
          {validatedMuseumExhibits.map(({ manifest }) => <button key={manifest.slug} type="button" aria-pressed={activeSlug === manifest.slug} onClick={() => navigate(manifest.slug)} className={`rounded-full border px-3 py-1.5 text-xs ${activeSlug === manifest.slug ? "border-amber-300 bg-amber-300/20" : "border-white/20 bg-black/20"}`}>{manifest.title}</button>)}
        </div>
      </section>
    </aside>
  );
}
