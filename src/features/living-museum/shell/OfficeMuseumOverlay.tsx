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
    window.dispatchEvent(new PopStateEvent("popstate"));
    onSelect(slug);
  };
  return (
    <aside className="museum-office-overlay pointer-events-none absolute inset-0 text-white" aria-label="Living Museum gallery">
      <header data-layout-panel="museum-bar" className="museum-office-bar pointer-events-auto">
        <button type="button" className="museum-office-title text-left" onClick={() => navigate(null)}><span>Office Annex</span><strong>Living Museum</strong></button>
        <div className="museum-office-actions"><MuseumSearch records={museumSearchCorpus} onNavigate={(result) => navigate(result.exhibitSlug ?? null)} /><button type="button" onClick={onExit} className="museum-office-exit">Office</button></div>
      </header>
      <section data-layout-panel="museum-arrival" className="museum-office-arrival pointer-events-auto">
        <p className="text-[10px] uppercase tracking-[0.28em] text-amber-300">{active ? "Active exhibit" : "Gallery arrival"}</p>
        <h1>{active?.title ?? "Explore the annex"}</h1>
        <p className="museum-office-summary">{active?.oneLineIntent ?? "Choose an exhibit while the office remains in view."}</p>
        <div className="museum-office-exhibits">
          {validatedMuseumExhibits.map(({ manifest }) => <button key={manifest.slug} type="button" aria-pressed={activeSlug === manifest.slug} onClick={() => navigate(manifest.slug)} className={`rounded-full border px-3 py-1.5 text-xs ${activeSlug === manifest.slug ? "border-amber-300 bg-amber-300/20" : "border-white/20 bg-black/20"}`}>{manifest.title}{manifest.category === "private-placeholder" ? " — Connector disabled" : ""}</button>)}
        </div>
      </section>
    </aside>
  );
}
