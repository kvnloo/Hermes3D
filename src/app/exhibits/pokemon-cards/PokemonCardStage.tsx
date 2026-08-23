"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Grid, RoundedBox } from "@react-three/drei";
import { Suspense, useEffect, useRef, type CSSProperties, type MutableRefObject } from "react";
import * as THREE from "three";
import type { CardTwinCard } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinCatalog";
import { resolveCardTwinSurfaceDepths } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinDepth";
import { selectCardTwinMotionSource, type CardTwinMotionSource } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinInteraction";
import { dampCardTwinMotion, normalizeCardTwinOrientation, resolveCardTwinTilt } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinMotion";
import { resolveCardTwinMaterial, type CardTwinDisplayMode, type CardTwinPaperSettings } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinPaperMode";
import { resolvePartsSheetLayout } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinPartsSheet";
import type { CardTwinArtMode } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinArtMode";

type CardTwinView = "gallery" | "macro" | "side" | "parts";

type ContractRefs = MutableRefObject<Array<HTMLSpanElement | null>>;

function MuseumLighting({ reduced, displayMode }: { reduced: boolean; displayMode: CardTwinDisplayMode }) {
  const rim = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (!rim.current || reduced) return;
    const sweep = clock.getElapsedTime() * 0.42;
    rim.current.position.x = Math.sin(sweep) * 3.2;
    rim.current.position.y = 2.2 + Math.cos(sweep * 0.8) * 0.5;
  });
  return <>
    <ambientLight intensity={displayMode === "paper" ? 1.05 : 0.72} />
    <directionalLight position={[-3.8, 4.6, 5.5]} intensity={displayMode === "paper" ? 1.15 : 2.15} color="#fff1d4" />
    <directionalLight position={[4, 0.8, 4]} intensity={0.72} color="#8fc9c1" />
    <pointLight ref={rim} position={[2.8, 2.4, 2.5]} intensity={displayMode === "paper" ? 0.12 : reduced ? 1.05 : 1.5} distance={9} color="#ffd29a" />
  </>;
}

function ResponsiveCamera({ view, reduced }: { view: CardTwinView; reduced: boolean }) {
  const { camera, size } = useThree();
  useFrame((_, delta) => {
    const orthographic = camera as THREE.OrthographicCamera;
    const mobile = size.width < 700;
    const nextZoom = view === "parts"
      ? (mobile ? 42 : 76)
      : view === "side"
      ? (mobile ? 64 : 92)
      : view === "macro"
        ? (mobile ? 130 : 160)
        : (mobile ? 116 : 138);
    const nextX = view === "gallery" && !mobile ? 0.38 : view === "side" ? 0.2 : 0;
    const amount = reduced ? 1 : 1 - Math.exp(-4.7 * Math.min(delta, 0.05));
    const zoom = THREE.MathUtils.lerp(orthographic.zoom, nextZoom, amount);
    const x = THREE.MathUtils.lerp(orthographic.position.x, nextX, amount);
    if (Math.abs(orthographic.zoom - nextZoom) > 0.01 || Math.abs(orthographic.position.x - nextX) > 0.001) {
      // eslint-disable-next-line react-hooks/immutability -- Three camera is intentionally imperative frame state.
      orthographic.zoom = zoom;
      // eslint-disable-next-line react-hooks/immutability -- Three camera is intentionally imperative frame state.
      orthographic.position.x = x;
      orthographic.updateProjectionMatrix();
    }
  });
  return null;
}

function LayeredCard({ card, artMode, artImage, reduced, exploded, motionEnabled, touchEnabled, contracts, onReady, onMotionSource, displayMode, partsSheet = false }: {
  card: CardTwinCard;
  artMode: CardTwinArtMode;
  artImage: string;
  reduced: boolean;
  exploded: boolean;
  motionEnabled: boolean;
  touchEnabled: boolean;
  contracts: ContractRefs;
  onReady: () => void;
  onMotionSource: (source: CardTwinMotionSource) => void;
  displayMode: CardTwinDisplayMode;
  partsSheet?: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const { gl } = useThree();
  const gestureStart = useRef<{ x: number; y: number } | null>(null);
  const orientation = useRef({ x: 0, y: 0 });
  const presentedInput = useRef({ x: 0, y: 0 });
  const pointer = useRef({ x: 0, y: 0 });
  const lastContractUpdate = useRef(0);
  const hasOrientationSample = useRef(false);
  const neutral = useRef<{ beta: number; gamma: number } | null>(null);
  const textures = useLoader(THREE.TextureLoader, [card.hiddenFill, ...card.layers.map((layer) => layer.texture), artImage]);
  const surfaceDepths = resolveCardTwinSurfaceDepths(card.layers);
  const partLayout = resolvePartsSheetLayout(card.layers.length, card.layers.length > 6 ? 4 : 3);

  useEffect(() => textures.forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }), [gl, textures]);

  useEffect(() => {
    onReady();
    if (!motionEnabled || reduced) return;
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (document.hidden || event.beta == null || event.gamma == null) return;
      const sample = { beta: event.beta, gamma: event.gamma };
      neutral.current ??= sample;
      const screenAngle = window.screen.orientation?.angle ?? window.orientation ?? 0;
      const target = normalizeCardTwinOrientation(sample, neutral.current, screenAngle);
      orientation.current = target;
      hasOrientationSample.current = true;
      onMotionSource("orientation");
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [motionEnabled, onMotionSource, onReady, reduced]);

  useEffect(() => {
    if (reduced) return;
    const handlePointer = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1,
        y: -((event.clientY / Math.max(window.innerHeight, 1)) * 2 - 1),
      };
      if (!hasOrientationSample.current) onMotionSource("pointer");
    };
    const desktopPointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!desktopPointer) return;
    window.addEventListener("pointermove", handlePointer, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointer);
  }, [onMotionSource, reduced]);

  useEffect(() => {
    if (!touchEnabled || reduced) return;
    const element = gl.domElement;
    const down = (event: PointerEvent) => { gestureStart.current = { x: event.clientX, y: event.clientY }; };
    const move = (event: PointerEvent) => {
      const start = gestureStart.current;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
      const bounds = element.getBoundingClientRect();
      pointer.current = { x: ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1, y: -(((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 - 1) };
      onMotionSource("touch");
      event.preventDefault();
    };
    const up = () => { gestureStart.current = null; };
    element.addEventListener("pointerdown", down, { passive: true });
    element.addEventListener("pointermove", move, { passive: false });
    element.addEventListener("pointerup", up, { passive: true });
    element.addEventListener("pointercancel", up, { passive: true });
    return () => {
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
    };
  }, [gl, onMotionSource, reduced, touchEnabled]);

  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    const source = touchEnabled ? "pointer" : selectCardTwinMotionSource(motionEnabled, hasOrientationSample.current);
    const targetInput = source === "orientation" ? orientation.current : pointer.current;
    presentedInput.current = dampCardTwinMotion(presentedInput.current, targetInput, delta, reduced ? Infinity : 14);
    const input = presentedInput.current;
    const cardTilt = resolveCardTwinTilt(input, 0, reduced);
    const tilt = dampCardTwinMotion(
      { x: root.current.rotation.x, y: root.current.rotation.y },
      { x: cardTilt.rotateX, y: cardTilt.rotateY },
      delta,
      reduced ? Infinity : 11,
    );
    root.current.rotation.set(tilt.x, tilt.y, 0);
    const updateContracts = clock.elapsedTime - lastContractUpdate.current >= 1 / 15;
    card.layers.forEach((layer, index) => {
      const mesh = root.current?.children[index + 3];
      if (!mesh) return;
      const parallax = resolveCardTwinTilt(input, layer.depthMm, reduced);
      const placement = partLayout[index];
      const spread = partsSheet ? placement.x : exploded ? (index - (card.layers.length - 1) / 2) * 1.25 : 0;
      const position = dampCardTwinMotion(
        { x: mesh.position.x, y: mesh.position.y },
        { x: spread + (partsSheet ? 0 : parallax.x), y: partsSheet ? placement.y : parallax.y },
        delta,
        reduced ? Infinity : 14,
      );
      mesh.position.x = position.x;
      mesh.position.y = position.y;
      if (updateContracts) {
        contracts.current[index]?.setAttribute("data-parallax-x", mesh.position.x.toFixed(4));
        contracts.current[index]?.setAttribute("data-parallax-y", mesh.position.y.toFixed(4));
      }
    });
    if (updateContracts) lastContractUpdate.current = clock.elapsedTime;
  });

  const shellMaterial = resolveCardTwinMaterial(displayMode);
  return <group ref={root}>
    <RoundedBox visible={!partsSheet} args={[2.25, 3.1, 0.11]} radius={0.055} smoothness={6} position-z={-0.075}>
      <meshStandardMaterial color="#d8d0bf" roughness={0.46} metalness={0.08} />
    </RoundedBox>
    <RoundedBox visible={!partsSheet} args={[2.2, 3.05, 0.018]} radius={0.045} smoothness={5} position-z={0.003}>
      <meshPhysicalMaterial color={card.accent} {...shellMaterial} iridescence={displayMode === "paper" ? 0 : 0.32} iridescenceIOR={1.32} />
    </RoundedBox>
    <mesh position-z={surfaceDepths.hiddenFill} renderOrder={1} visible={!exploded && !partsSheet}>
      <planeGeometry args={[2.15, 3]} />
      <meshBasicMaterial map={textures[0]} transparent alphaTest={0.01} depthWrite toneMapped={false} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={4} polygonOffsetUnits={4} />
    </mesh>
    {card.layers.map((layer, index) => <mesh
      key={layer.id}
      position={[partsSheet ? partLayout[index].x : exploded ? (index - (card.layers.length - 1) / 2) * 1.25 : 0, partsSheet ? partLayout[index].y : 0, partsSheet ? 0.03 : surfaceDepths[layer.id]]}
      scale={partsSheet ? 0.62 : 1}
      renderOrder={index + 2}
    >
      <planeGeometry args={[2.15, 3]} />
      <meshBasicMaterial map={textures[index + 1]} transparent alphaTest={0.01} depthWrite toneMapped={false} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-(index + 1)} polygonOffsetUnits={-(index + 1)} />
    </mesh>)}
    <mesh position-z={surfaceDepths.foil - 0.0001} renderOrder={19} visible={artMode === "hd" && !exploded && !partsSheet}>
      <planeGeometry args={[2.15, 3]} />
      <meshBasicMaterial map={textures[textures.length - 1]} toneMapped={false} />
    </mesh>
    {card.layers.map((layer, index) => <mesh key={`${layer.id}-foam-shadow`} visible={!partsSheet} position={[0.018, -0.022, surfaceDepths[layer.id] - 0.006]} renderOrder={index + 1}>
      <planeGeometry args={[2.15, 3]} />
      <meshBasicMaterial color="#130d08" alphaMap={textures[index + 1]} transparent opacity={0.24} depthWrite={false} toneMapped={false} />
    </mesh>)}
    <mesh position-z={surfaceDepths.foil} renderOrder={20} visible={!partsSheet && displayMode === "glass"}>
      <planeGeometry args={[2.12, 2.97]} />
      <meshPhysicalMaterial color={card.accent} transparent opacity={0.1} depthWrite={false} roughness={0.2} metalness={0.3} clearcoat={1} clearcoatRoughness={0.16} iridescence={0.8} iridescenceIOR={1.45} blending={THREE.AdditiveBlending} />
    </mesh>
    <group visible={!partsSheet} position={[0, -1.72, -0.1]}>
      <mesh rotation-x={-0.16}>
        <boxGeometry args={[1.22, 0.14, 0.72]} />
        <meshStandardMaterial color="#382b20" roughness={0.56} metalness={0.08} />
      </mesh>
      <mesh position={[0, -0.14, -0.1]}>
        <cylinderGeometry args={[0.66, 0.78, 0.18, 48]} />
        <meshStandardMaterial color="#171918" roughness={0.38} metalness={0.3} />
      </mesh>
    </group>
  </group>;
}

export function PokemonCardStage({ card, artMode, artImage, reduced, view, cameraMoving, texturesReady, onTexturesReady, paperSettings, motionEnabled = false, touchEnabled = false, onMotionSource = () => undefined }: {
  card: CardTwinCard;
  artMode: CardTwinArtMode;
  artImage: string;
  reduced: boolean;
  view: CardTwinView;
  cameraMoving: boolean;
  texturesReady: boolean;
  onTexturesReady: () => void;
  paperSettings: CardTwinPaperSettings;
  motionEnabled?: boolean;
  touchEnabled?: boolean;
  onMotionSource?: (source: CardTwinMotionSource) => void;
}) {
  const exploded = view === "side";
  const contracts = useRef<Array<HTMLSpanElement | null>>([]);
  return <section
    data-testid="pokemon-card-webgl-stage"
    data-renderer="three-webgl"
    data-view={view}
    data-parts-sheet={view === "parts" ? "cutting-mat-flat-lay" : undefined}
    data-card-id={card.id}
    data-art-mode={artMode}
    data-art-image={artImage}
    data-card-printing={`${card.name} · ${card.set} · ${card.printing}`}
    data-hidden-fill={card.hiddenFill}
    data-textures-ready={String(texturesReady)}
    data-camera-anchor={view === "gallery" ? "gallery" : `${card.id}-inspection`}
    data-camera-transition={reduced ? "instant" : cameraMoving ? "moving" : view === "gallery" ? "idle" : "settled"}
    data-camera-framing={view === "macro" ? "inspection-fit" : undefined}
    data-card-shell="beveled-physical-slab"
    data-display-furniture="museum-plinth"
    data-lighting-rig="key-fill-rim"
    data-foil-response="restrained-iridescent"
    data-display-mode={paperSettings.mode}
    data-foil-motion={reduced ? "disabled" : "sweeping-rim"}
    data-static-composition={reduced ? "assembled-readable" : undefined}
    data-touch-parallax={touchEnabled ? "enabled" : "disabled"}
    className="webgl-stage"
    style={{ "--paper-brightness": paperSettings.brightness, "--paper-contrast": paperSettings.contrast, "--paper-grain": paperSettings.grain } as CSSProperties}
    aria-label={`Exact ${card.name} ${card.printing} layered CardTwin construction`}
  >
    <div className="webgl-contracts" aria-hidden="true">
      {card.layers.map((layer, index) => <span
        key={layer.id}
        ref={(node) => { contracts.current[index] = node; }}
        data-layer-id={layer.id}
        data-layer-depth={layer.depthMm}
        data-plane-z={resolveCardTwinSurfaceDepths(card.layers)[layer.id]}
        data-layer-texture={layer.texture}
        data-part-label={view === "parts" ? `${index + 1}. ${layer.label}` : undefined}
        data-parallax-x="0"
        data-parallax-y="0"
      />)}
    </div>
    <Canvas orthographic dpr={[1, 2]} camera={{ position: [0, 0, 10], zoom: 138, near: 0.08, far: 30 }} gl={{ antialias: true, alpha: true, logarithmicDepthBuffer: true, powerPreference: "high-performance" }}>
      <color attach="background" args={["#14211f"]} />
      {view === "parts" && <Grid args={[10, 8]} position={[0, 0, -0.1]} rotation-x={Math.PI / 2} cellSize={0.25} cellThickness={0.5} cellColor="#3c7468" sectionSize={1} sectionThickness={1} sectionColor="#6da095" fadeDistance={20} infiniteGrid={false} />}
      <MuseumLighting reduced={reduced} displayMode={paperSettings.mode} />
      <ResponsiveCamera view={view} reduced={reduced} />
      <Suspense fallback={null}>
        <LayeredCard key={`${card.id}-${artMode}`} card={card} artMode={artMode} artImage={artImage} reduced={reduced} exploded={exploded} partsSheet={view === "parts"} motionEnabled={motionEnabled} touchEnabled={touchEnabled} contracts={contracts} onReady={onTexturesReady} onMotionSource={onMotionSource} displayMode={paperSettings.mode} />
      </Suspense>
    </Canvas>
  </section>;
}