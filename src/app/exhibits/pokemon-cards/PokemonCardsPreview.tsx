"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { CARD_TWIN_CARDS } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinCatalog";
import { reduceCardTwinFullscreen, type CardTwinFullscreenState, type CardTwinMotionSource } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinInteraction";
import { PokemonCardStage } from "./PokemonCardStage";
import { CARD_TWIN_PAPER_DEFAULTS, loadCardTwinPaperSettings, saveCardTwinPaperSettings, type CardTwinPaperSettings } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinPaperMode";

const revealPhases = ["capture", "lookup", "canonical", "segment", "assemble", "ready"] as const;
const revealLabels = ["Phone photo", "Exact printing lookup", "Canonical HD", "SAM 2.1 cut", "Layer assembly", "CardTwin ready"];

export function PokemonCardsPreview({ initialView }: { initialView: "gallery" | "macro" | "side" }) {
  const [reduced, setReduced] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [texturesReady, setTexturesReady] = useState(false);
  const [view, setView] = useState<"gallery" | "macro" | "side" | "parts">(initialView);
  const [cameraMoving, setCameraMoving] = useState(false);
  const [motionStatus, setMotionStatus] = useState<"idle" | "orientation" | "calibrated" | "denied" | "unavailable">("idle");
  const [motionSource, setMotionSource] = useState<CardTwinMotionSource>("pointer");
  const [fullscreen, setFullscreen] = useState<CardTwinFullscreenState>("gallery");
  const [paperSettings, setPaperSettings] = useState<CardTwinPaperSettings>(CARD_TWIN_PAPER_DEFAULTS);
  const [paperSettingsReady, setPaperSettingsReady] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const inspectRoot = useRef<HTMLDivElement>(null);
  const card = CARD_TWIN_CARDS[cardIndex];

  useEffect(() => {
    setPaperSettings(loadCardTwinPaperSettings(window.localStorage));
    setPaperSettingsReady(true);
  }, []);
  const updatePaperSettings = (next: CardTwinPaperSettings) => {
    setPaperSettings(next);
    saveCardTwinPaperSettings(window.localStorage, next);
  };

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
  const handleMotionSource = useCallback((source: CardTwinMotionSource) => {
    setMotionSource(source);
    if (source === "orientation") setMotionStatus("calibrated");
  }, []);
  const enableMotion = async () => {
    if (!("DeviceOrientationEvent" in window)) {
      setMotionStatus("unavailable");
      return;
    }
    const OrientationEvent = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    try {
      const permission = OrientationEvent.requestPermission ? await OrientationEvent.requestPermission() : "granted";
      setMotionStatus(permission === "granted" ? "orientation" : "denied");
    } catch {
      setMotionStatus("denied");
    }
  };
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === inspectRoot.current;
      setFullscreen((state) => reduceCardTwinFullscreen(state, { type: "fullscreenchange", active }));
      if (!active) setView(initialView);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [initialView]);

  const inspectCard = async () => {
    if (!inspectRoot.current || fullscreen !== "gallery") return;
    setFullscreen((state) => reduceCardTwinFullscreen(state, { type: "inspect" }));
    setCameraMoving(!reduced);
    setView("macro");
    if (!reduced) window.setTimeout(() => setCameraMoving(false), 900);
    try {
      await inspectRoot.current.requestFullscreen({ navigationUI: "hide" });
    } catch {
      setView(initialView);
      setFullscreen((state) => reduceCardTwinFullscreen(state, { type: "request-failed" }));
    }
  };
  const exitInspection = () => document.fullscreenElement && document.exitFullscreen();
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
      <div ref={inspectRoot} className="hero-cards" data-view={view} data-fullscreen-state={fullscreen} data-motion-source={motionSource} data-display-mode={paperSettings.mode}>
        <PokemonCardStage card={card} reduced={reduced} view={view} cameraMoving={cameraMoving} texturesReady={texturesReady} onTexturesReady={handleReady} paperSettings={paperSettings} motionEnabled={motionStatus === "orientation" || motionStatus === "calibrated"} onMotionSource={handleMotionSource} />
        {paperSettingsReady && <div className="paper-controls">
          <button type="button" aria-pressed={paperSettings.mode === "paper"} onClick={() => updatePaperSettings({ ...paperSettings, mode: paperSettings.mode === "paper" ? "glass" : "paper" })}>{paperSettings.mode === "paper" ? "Paper · on" : "Paper"}</button>
          {paperSettings.mode === "paper" && <button type="button" onClick={() => setCalibrating((value) => !value)}>Calibrate</button>}
        </div>}
        {calibrating && paperSettings.mode === "paper" && <section className="paper-calibration" aria-label="Paper display calibration">
          <strong>Paper under this light</strong><div className="paper-swatch" />
          {(["brightness", "contrast", "grain"] as const).map((key) => <label key={key}>{key}<input type="range" aria-label={`Paper ${key}`} min={key === "brightness" ? .85 : key === "contrast" ? .8 : 0} max={key === "brightness" ? 1.15 : key === "contrast" ? 1.1 : 1} step="0.01" value={paperSettings[key]} onChange={(event) => updatePaperSettings({ ...paperSettings, [key]: Number(event.target.value) })} /></label>)}
          <button type="button" onClick={() => setCalibrating(false)}>Done</button>
        </section>}
        <button type="button" className="parts-sheet-control" aria-pressed={view === "parts"} onClick={() => setView(view === "parts" ? initialView : "parts")}>Parts Sheet</button>
        <aside className="card-face-gallery" aria-label="Nine canonical card faces">
          {galleryFaces.map((face, index) => <button key={`${face.id}-${index}`} type="button" onClick={() => chooseCard(index % CARD_TWIN_CARDS.length)} aria-label={`Select ${face.name} card ${index + 1}`}>
            {/* Canonical images remain uncropped; the sheen is a separate light-response layer. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- canonical exhibit pixels must bypass optimization. */}
            <img data-card-face="true" src={face.canonical} alt={`${face.name} ${face.printing} canonical card face`} />
            <i aria-hidden="true" />
          </button>)}
        </aside>
        {fullscreen === "fullscreen"
          ? <button type="button" className="inspect-card" onClick={exitInspection}>Exit inspection</button>
          : <button type="button" className="inspect-card" onClick={inspectCard} disabled={fullscreen === "requesting"}>Inspect selected card</button>}
        {!reduced && <button type="button" className="motion-control" onClick={enableMotion} disabled={motionStatus === "orientation" || motionStatus === "calibrated"}>
          {motionStatus === "idle" ? "Enable motion" : motionStatus === "orientation" ? "Hold steady · calibrating" : motionStatus === "calibrated" ? "Orientation · active" : motionStatus === "denied" ? "Motion denied · pointer active" : "Motion unavailable · pointer active"}
        </button>}
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
      <footer data-testid="exhibit-controls"><span>Pointer or phone tilt moves each semantic plane by depth</span><b>{view === "parts" ? `PARTS SHEET · ${card.layers.length} CUTS INSPECTABLE` : view === "side" ? "EXPLODED LAYERS" : "ASSEMBLED FRONT"} · REDUCED MOTION SAFE</b></footer>
    </main>
  );
}