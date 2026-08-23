"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { CARD_TWIN_CARDS } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinCatalog";
import { CARD_TWIN_INPUT_INITIAL, reduceCardTwinFullscreen, reduceCardTwinInput, type CardTwinFullscreenState, type CardTwinMotionSource } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinInteraction";
import { PokemonCardStage } from "./PokemonCardStage";
import { CARD_TWIN_PAPER_DEFAULTS, loadCardTwinPaperSettings, saveCardTwinPaperSettings, type CardTwinPaperSettings } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinPaperMode";
import { CARD_TWIN_ART_DEFAULT, loadCardTwinArtMode, resolveCardTwinArt, saveCardTwinArtMode, type CardTwinArtMode } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinArtMode";

const revealPhases = ["capture", "lookup", "canonical", "segment", "assemble", "ready"] as const;
const revealLabels = ["Phone photo", "Exact printing lookup", "Canonical HD", "SAM 2.1 cut", "Layer assembly", "CardTwin ready"];

export function PokemonCardsPreview({ initialView }: { initialView: "gallery" | "macro" | "side" }) {
  const [reduced, setReduced] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [texturesReady, setTexturesReady] = useState(false);
  const [view, setView] = useState<"gallery" | "macro" | "side" | "parts">(initialView);
  const [cameraMoving, setCameraMoving] = useState(false);
  const [, setMotionStatus] = useState<"idle" | "orientation" | "calibrated" | "denied" | "unavailable">("idle");
  const [motionSource, setMotionSource] = useState<CardTwinMotionSource>("pointer");
  const [input, setInput] = useState(CARD_TWIN_INPUT_INITIAL);
  const [fullscreen, setFullscreen] = useState<CardTwinFullscreenState>("gallery");
  const [paperSettings, setPaperSettings] = useState<CardTwinPaperSettings>(CARD_TWIN_PAPER_DEFAULTS);
  const [paperSettingsReady, setPaperSettingsReady] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [artMode, setArtMode] = useState<CardTwinArtMode>(CARD_TWIN_ART_DEFAULT);
  const [artModeReady, setArtModeReady] = useState(false);
  const inspectRoot = useRef<HTMLDivElement>(null);
  const galleryScrollPosition = useRef(0);
  const card = CARD_TWIN_CARDS[cardIndex];
  const resolvedArt = resolveCardTwinArt(card, artMode);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-persisted display preferences hydrate after SSR.
    setPaperSettings(loadCardTwinPaperSettings(window.localStorage));
    setPaperSettingsReady(true);
  }, []);
  useEffect(() => {
    // The selected printing owns a distinct persisted preference; hydrate it when that identity changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setArtMode(loadCardTwinArtMode(window.localStorage, card.id));
    setArtModeReady(true);
  }, [card.id]);
  const updateArtMode = (next: CardTwinArtMode) => {
    if (next === "hd" && !card.approvedHdArt) return;
    setArtMode(next);
    saveCardTwinArtMode(window.localStorage, card.id, next);
  };
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
    setArtModeReady(false);
    setTexturesReady(false);
    setPhaseIndex(reduced ? revealPhases.length - 1 : 0);
  };
  const handleReady = useCallback(() => setTexturesReady(true), []);
  const handleMotionSource = useCallback((source: CardTwinMotionSource) => {
    setMotionSource(source);
    if (source === "orientation") {
      setMotionStatus("calibrated");
      setInput((state) => reduceCardTwinInput(state, { type: "orientation-sample" }));
    }
  }, []);
  const enableMotion = async () => {
    if (!("DeviceOrientationEvent" in window)) {
      setMotionStatus("unavailable");
      setInput((state) => reduceCardTwinInput(state, { type: "orientation-unavailable" }));
      return;
    }
    const OrientationEvent = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    try {
      const permission = OrientationEvent.requestPermission ? await OrientationEvent.requestPermission() : "granted";
      setMotionStatus(permission === "granted" ? "orientation" : "denied");
      if (permission === "granted") setInput((state) => reduceCardTwinInput(state, { type: "select-gyro" }));
      else setInput((state) => reduceCardTwinInput(state, { type: "orientation-denied" }));
    } catch {
      setMotionStatus("denied");
      setInput((state) => reduceCardTwinInput(state, { type: "orientation-denied" }));
    }
  };
  const selectTouch = () => {
    setInput((state) => reduceCardTwinInput(state, { type: "select-touch" }));
    setMotionSource("touch");
    window.localStorage.setItem("cardtwin-input-preference", "touch");
  };
  const selectAuto = () => {
    setInput((state) => reduceCardTwinInput(state, { type: "select-auto" }));
    setMotionSource("pointer");
    window.localStorage.setItem("cardtwin-input-preference", "auto");
  };
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === inspectRoot.current;
      setFullscreen((state) => reduceCardTwinFullscreen(state, { type: "fullscreenchange", active }));
      if (!active) {
        setView(initialView);
        requestAnimationFrame(() => window.scrollTo(0, galleryScrollPosition.current));
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [initialView]);

  const inspectCard = async () => {
    if (!inspectRoot.current || fullscreen !== "gallery") return;
    galleryScrollPosition.current = window.scrollY;
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
  return (
    <main data-testid="pokemon-cards-exhibit-active" data-reduced-motion={String(reduced)} className="card-exhibit" style={{ "--card-accent": card.accent } as CSSProperties}>
      <div className="museum-haze" />
      <header data-testid="exhibit-hero" className="exhibit-title">
        <Link href="/" aria-label="Back to museum">Back</Link>
        <div><strong>{card.name}</strong><span>{card.set} / {card.printing}</span></div>
        <span>CardTwin</span>
      </header>
      <nav className="printing-switcher" aria-label="Exact printing selection">
        {CARD_TWIN_CARDS.map((choice, index) => <button
          key={choice.id}
          type="button"
          aria-label={`View exact printing ${choice.name} ${choice.printing}`}
          aria-pressed={index === cardIndex}
          onClick={() => chooseCard(index)}
        ><b>{choice.name}</b><small>{choice.set} / {choice.printing}</small></button>)}
      </nav>
      <div ref={inspectRoot} className="hero-cards" data-view={view} data-fullscreen-state={fullscreen} data-motion-source={motionSource} data-input-preference={input.preference} data-display-mode={paperSettings.mode}>
        <section className="card-stage-shell" aria-label={`${card.name} interactive card`}>
          <PokemonCardStage card={card} artMode={resolvedArt.mode} artImage={resolvedArt.image} reduced={reduced} view={view} cameraMoving={cameraMoving} texturesReady={texturesReady} onTexturesReady={handleReady} paperSettings={paperSettings} motionEnabled={input.preference !== "touch" && input.availability !== "denied" && input.availability !== "unavailable"} touchEnabled={input.preference === "touch"} onMotionSource={handleMotionSource} />
        </section>
        <aside className="viewer-panel" aria-label="Viewer controls">
          <section className="display-controls" role="group" aria-label="Display">
            <span>Artwork</span>
            <div className="segmented-control" role="group" aria-label="Original or HD artwork">
              <button type="button" aria-pressed={resolvedArt.mode === "original"} disabled={!artModeReady} onClick={() => updateArtMode("original")}>Original</button>
              <button type="button" aria-pressed={resolvedArt.mode === "hd"} disabled={!artModeReady || !card.approvedHdArt} onClick={() => updateArtMode("hd")}>HD Art</button>
            </div>
            <strong>{resolvedArt.mode === "hd" ? "HD Art · flat preview" : "Original · canonical printing"}</strong>
            {resolvedArt.mode === "hd" && <small>Assembled front only · layered parallax unavailable</small>}
            {!card.approvedHdArt && <small>HD version unavailable</small>}
            {paperSettingsReady && <><span>Material</span><div className="segmented-control material-control">
              <button type="button" aria-pressed={paperSettings.mode === "glass"} onClick={() => updatePaperSettings({ ...paperSettings, mode: "glass" })}>Glass</button>
              <button type="button" aria-pressed={paperSettings.mode === "paper"} onClick={() => updatePaperSettings({ ...paperSettings, mode: "paper" })}>{paperSettings.mode === "paper" ? "Paper · on" : "Paper"}</button>
            </div></>}
            {paperSettings.mode === "paper" && <button className="calibrate-control" type="button" onClick={() => setCalibrating((value) => !value)}>Calibrate</button>}
          </section>
        {calibrating && paperSettings.mode === "paper" && <section className="paper-calibration" aria-label="Paper display calibration">
          <strong>Paper under this light</strong><div className="paper-swatch" />
          {(["brightness", "contrast", "grain"] as const).map((key) => <label key={key}>{key}<input type="range" aria-label={`Paper ${key}`} min={key === "brightness" ? .85 : key === "contrast" ? .8 : 0} max={key === "brightness" ? 1.15 : key === "contrast" ? 1.1 : 1} step="0.01" value={paperSettings[key]} onChange={(event) => updatePaperSettings({ ...paperSettings, [key]: Number(event.target.value) })} /></label>)}
          <button type="button" onClick={() => setCalibrating(false)}>Done</button>
        </section>}
        <div className="mobile-actions" data-testid="cardtwin-mobile-actions">
          {fullscreen === "fullscreen"
            ? <button type="button" className="inspect-card" onClick={exitInspection}>Exit</button>
            : <button type="button" className="inspect-card" onClick={inspectCard} disabled={fullscreen === "requesting"}>Inspect fullscreen</button>}
          {!reduced && <div className="input-controls" role="group" aria-label="Input">
            <button type="button" aria-pressed={input.preference === "auto"} onClick={selectAuto}>Auto</button>
            <button type="button" aria-pressed={input.preference === "gyro"} onClick={enableMotion}>Gyro</button>
            <button type="button" aria-pressed={input.preference === "touch"} onClick={selectTouch}>Touch</button>
            <output role="status">{input.source === "gyro" ? "Gyro active" : input.source === "touch" ? "Touch fallback" : input.availability === "denied" || input.availability === "unavailable" ? "Unavailable" : "Auto"}</output>
          </div>}
        </div>
        <details className="details-drawer" role="group" aria-label="Details">
          <summary>Details <span>Provenance and QA</span></summary>
          <div className="details-content">
            <p><b>Candidate assembly</b><span>Awaiting Kevin HITL</span></p>
            <section data-testid="cardtwin-reveal" data-phase={reduced ? "ready" : revealPhases[phaseIndex]} className="reveal-console">
              <ol data-testid="cardtwin-pipeline">{revealLabels.map((label, index) => <li key={label} data-active={index <= phaseIndex}>{label}</li>)}</ol>
              <span className="reveal-status">{revealLabels[reduced ? revealLabels.length - 1 : phaseIndex]}</span>
            </section>
            <div className="layer-ledger" aria-label={`${card.name} semantic layer ledger`}>{card.layers.map((layer) => <article key={layer.id} data-card-object="true"><b>{layer.label}</b><span>{layer.depthMm.toFixed(1)} mm · exact RGBA</span></article>)}</div>
            {resolvedArt.mode === "hd" && card.approvedHdArt && <p><b>{card.approvedHdArt.model}</b><span>Assembled front only / {card.approvedHdArt.outputSha256.slice(0, 12)}</span></p>}
            <button type="button" className="parts-sheet-control" aria-pressed={view === "parts"} onClick={() => setView(view === "parts" ? initialView : "parts")}>Parts Sheet / QA surface</button>
          </div>
        </details>
        </aside>
        <span className="texture-contract" data-textures-ready={String(texturesReady)} aria-hidden="true" />
      </div>
    </main>
  );
}