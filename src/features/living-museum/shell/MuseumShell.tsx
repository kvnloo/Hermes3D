"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { MuseumExhibitSlug } from "../core/MuseumExhibitV1";
import { resolveMuseumDeepLink } from "../core/MuseumRuntimeV1";
import { museumSearchCorpus, validatedMuseumExhibits } from "../registry";
import { MuseumCanvas, useMuseumCapabilities } from "./MuseumCanvas";
import { MuseumSearch } from "./MuseumSearch";
import "./museum.css";

export function MuseumShell() {
  const params = useSearchParams();
  const { reducedMotion, webglAvailable } = useMuseumCapabilities();
  const navigation = useMemo(() => resolveMuseumDeepLink(params, validatedMuseumExhibits.map(({ manifest }) => manifest)), [params]);
  const [selectedSlug, setSelectedSlug] = useState<MuseumExhibitSlug | null | undefined>(undefined);
  const activeSlug = selectedSlug === undefined ? navigation.exhibitSlug : selectedSlug;
  const active = validatedMuseumExhibits.find(({ manifest }) => manifest.slug === activeSlug)?.manifest;

  return (
    <div className="museum-shell">
      <div className="museum-scene" aria-hidden="true"><MuseumCanvas activeSlug={activeSlug} reducedMotion={reducedMotion} webglAvailable={webglAvailable} /></div>
      <header className="museum-header">
        <Link href="/museum" className="museum-wordmark" onClick={() => setSelectedSlug(null)}>Living Museum</Link>
        <MuseumSearch records={museumSearchCorpus} />
      </header>
      <section className="museum-intro" aria-live="polite">
        <p className="museum-kicker">A body of original work</p>
        <h1>{active?.title ?? "Worlds become legible through artifacts."}</h1>
        <p>{active?.oneLineIntent ?? "Enter a spatial archive of process, detail and verified evolution."}</p>
        {active ? <button type="button" onClick={() => setSelectedSlug(null)}>Return to arrival</button> : validatedMuseumExhibits.length > 0 ? <button type="button" onClick={() => setSelectedSlug(validatedMuseumExhibits[0].manifest.slug)}>Begin the journey</button> : <span className="museum-quiet">The galleries are being prepared.</span>}
      </section>
      <footer className="museum-footer">
        <span>UNAPPROVED NIGHTLY CANDIDATE</span>
        <span>{webglAvailable ? "Spatial view" : "Static composition"}</span>
        <span>{reducedMotion ? "Reduced motion" : "Authored camera"}</span>
      </footer>
    </div>
  );
}
