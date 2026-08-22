"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { CARD_TWIN_CARDS } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinCatalog";
import { PokemonCardStage } from "./PokemonCardStage";

const revealPhases = ["capture", "lookup", "canonical", "segment", "assemble", "ready"] as const;
const revealLabels = ["Phone photo", "Exact printing lookup", "Canonical HD", "SAM 2.1 cut", "Layer assembly", "CardTwin ready"];

export function PokemonCardsPreview({ initialView }: { initialView: "gallery" | "macro" | "side" }) {
  const [reduced, setReduced] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [texturesReady, setTexturesReady] = useState(false);
  const [view, setView] = useState(initialView);
  const [cameraMoving, setCameraMoving] = useState(false);
  const card = CARD_TWIN_CARDS[cardIndex];

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduced) return;
    if (phaseIndex >= revealPhases.length - 1) return;
    const timer = window.setTimeout(() => setPhaseIndex((value) => value + 1), phaseIndex === 0 ? 420 : 620);
    return () => window.clearTimeout(timer);
  }, [phaseIndex, reduced]);

  const chooseCard = (index: number) => {
    if (index === cardIndex) return;
    setCardIndex(index);
    setTexturesReady(false);
    setPhaseIndex(reduced ? revealPhases.length - 1 : 0);
  };
  const handleReady = useCallback(() => setTexturesReady(true), []);
  const inspectCard = () => {
    if (view === "macro") return;
    setCameraMoving(!reduced);
    setView("macro");
    if (!reduced) window.setTimeout(() => setCameraMoving(false), 900);
  };
  const galleryFaces = Array.from({ length: 9 }, (_, index) => CARD_TWIN_CARDS[index % CARD_TWIN_CARDS.length]);

  return (
    <main data-testid="pokemon-cards-exhibit-active" data-reduced-motion={String(reduced)} className="card-exhibit" style={{ "--card-accent": card.accent } as CSSProperties}>
      <div className="museum-haze" />
      <header data-testid="exhibit-hero" className="exhibit-title">
        <span>CardTwin · Exact printing archive</span>
        <strong>{card.name} · {card.printing}</strong>
        <p>Canonical visible pixels, semantically cut into physical planes. Hidden-only fill disclosed; no SR or replacement art.</p>
      </header>
      <nav className="printing-switcher" aria-label="Exact printing selection">
        {CARD_TWIN_CARDS.map((choice, index) => <button
          key={choice.id}
          type="button"
          aria-label={`View exact printing ${choice.name} ${choice.printing}`}
          aria-pressed={index === cardIndex}
          onClick={() => chooseCard(index)}
        ><span>0{index + 1}</span><b>{choice.name}</b><small>{choice.set} · {choice.printing}</small></button>)}
      </nav>
      <section data-testid="cardtwin-reveal" data-phase={reduced ? "ready" : revealPhases[phaseIndex]} className="reveal-console">
        <ol data-testid="cardtwin-pipeline">{revealLabels.map((label, index) => <li key={label} data-active={index <= phaseIndex}><i>{index + 1}</i>{label}</li>)}</ol>
        <span className="reveal-status">{revealLabels[reduced ? revealLabels.length - 1 : phaseIndex]}</span>
      </section>
      <div className="hero-cards">
        <PokemonCardStage card={card} reduced={reduced} view={view} cameraMoving={cameraMoving} texturesReady={texturesReady} onTexturesReady={handleReady} />
        <aside className="card-face-gallery" aria-label="Nine canonical card faces">
          {galleryFaces.map((face, index) => <button key={`${face.id}-${index}`} type="button" onClick={() => chooseCard(index % CARD_TWIN_CARDS.length)} aria-label={`Select ${face.name} card ${index + 1}`}>
            {/* Canonical images remain uncropped; the sheen is a separate light-response layer. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- canonical exhibit pixels must bypass optimization. */}
            <img data-card-face="true" src={face.canonical} alt={`${face.name} ${face.printing} canonical card face`} />
            <i aria-hidden="true" />
          </button>)}
        </aside>
        <button type="button" className="inspect-card" onClick={inspectCard}>Inspect selected card</button>
        <div className="layer-ledger" aria-label={`${card.name} semantic layer ledger`}>
          {card.layers.map((layer) => <article key={layer.id} data-card-object="true"><b>{layer.label}</b><span>{layer.depthMm.toFixed(1)} mm · exact RGBA</span></article>)}
        </div>
        <span className="texture-contract" data-textures-ready={String(texturesReady)} aria-hidden="true" />
      </div>
      <section className="study-strip" aria-label="Canonical CardTwin printings">
        {CARD_TWIN_CARDS.map((choice, index) => <button key={choice.id} type="button" onClick={() => chooseCard(index)} data-card-object="true" data-selected={index === cardIndex} className="study-card"><span>EXACT PRINTING</span><b>0{index + 1}</b><small>{choice.name}</small></button>)}
        <article data-card-object="true" className="study-card"><span>PROVENANCE</span><b>HD</b><small>Canonical source</small></article>
        <article data-card-object="true" className="study-card"><span>SEGMENTATION</span><b>2.1</b><small>Meta SAM</small></article>
      </section>
      <footer data-testid="exhibit-controls"><span>Pointer or phone tilt moves each semantic plane by depth</span><b>{view === "side" ? "EXPLODED LAYERS" : "ASSEMBLED FRONT"} · REDUCED MOTION SAFE</b></footer>
    </main>
  );
}