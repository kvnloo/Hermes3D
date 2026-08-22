"use client";

import { useEffect, useState } from "react";
import { PokemonCardStage } from "./PokemonCardStage";

const editions = [
  { name: "Astral Archive", mark: "I", kind: "astral", note: "High-relief celestial observatory" },
  { name: "Verdant Reliquary", mark: "II", kind: "verdant", note: "Recessed old-growth diorama" },
  { name: "Emberwing Sanctuary", mark: "III", kind: "ember", note: "Fourteen-layer fire-bird shadowbox" },
];

export function PokemonCardsPreview({ initialView }: { initialView: "gallery" | "macro" | "side" }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <main data-testid="pokemon-cards-exhibit-active" data-reduced-motion={String(reduced)} className="card-exhibit">
      <div className="museum-haze" />
      <header data-testid="exhibit-hero" className="exhibit-title">
        <span>Hermes Living Museum · Collector Study 07</span>
        <strong>The Cabinet of Impossible Editions</strong>
        <p>Three synthetic, rights-safe studies in foil, paper, depth and light.</p>
      </header>
      <div className="hero-cards">
        <PokemonCardStage reduced={reduced} view={initialView} />
        <div className="stage-card-hitboxes">{editions.map((edition) => <article key={edition.name} data-card-object="true" data-variant={edition.kind} className="stage-card-hitbox"><b>{edition.name}</b><span>{edition.note}</span></article>)}</div>
      </div>
      <section className="study-strip" aria-label="Supporting card studies">
        {Array.from({ length: 6 }, (_, index) => <article data-card-object="true" className="study-card" key={index}><span>FIELD STUDY</span><b>0{index + 4}</b><i /></article>)}
      </section>
      <footer data-testid="exhibit-controls"><span>Move pointer to inspect foil and parallax</span><b>SCROLL · TILT · DWELL</b></footer>
    </main>
  );
}
