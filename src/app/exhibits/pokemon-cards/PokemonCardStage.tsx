"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { CardTwinCard } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinCatalog";
import { resolveCardTwinTilt } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinMotion";

type ContractRefs = MutableRefObject<Array<HTMLSpanElement | null>>;

function ResponsiveCamera({ view }: { view: "gallery" | "macro" | "side" }) {
  const { camera, size } = useThree();
  useFrame(() => {
    const orthographic = camera as THREE.OrthographicCamera;
    const mobile = size.width < 700;
    const nextZoom = view === "side" ? (mobile ? 64 : 92) : (mobile ? 116 : 138);
    if (orthographic.zoom !== nextZoom) {
      // eslint-disable-next-line react-hooks/immutability -- Three camera is intentionally imperative frame state.
      orthographic.zoom = nextZoom;
      orthographic.updateProjectionMatrix();
    }
  });
  return null;
}

function LayeredCard({ card, reduced, exploded, contracts, onReady }: {
  card: CardTwinCard;
  reduced: boolean;
  exploded: boolean;
  contracts: ContractRefs;
  onReady: () => void;
}) {
  const root = useRef<THREE.Group>(null);
  const orientation = useRef({ x: 0, y: 0 });
  const textures = useLoader(THREE.TextureLoader, [card.hiddenFill, ...card.layers.map((layer) => layer.texture)]);

  useMemo(() => textures.forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
  }), [textures]);

  useEffect(() => {
    onReady();
    const handleOrientation = (event: DeviceOrientationEvent) => {
      orientation.current = {
        x: THREE.MathUtils.clamp((event.gamma ?? 0) / 22, -1, 1),
        y: THREE.MathUtils.clamp((event.beta ?? 0) / 28, -1, 1),
      };
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [onReady]);

  useFrame(({ pointer }) => {
    if (!root.current) return;
    const input = Math.abs(pointer.x) + Math.abs(pointer.y) > 0.02 ? pointer : orientation.current;
    const cardTilt = resolveCardTwinTilt(input, 0, reduced);
    root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, cardTilt.rotateX, reduced ? 1 : 0.09);
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, cardTilt.rotateY, reduced ? 1 : 0.09);
    card.layers.forEach((layer, index) => {
      const mesh = root.current?.children[index + 1];
      if (!mesh) return;
      const parallax = resolveCardTwinTilt(input, layer.depthMm, reduced);
      const spread = exploded ? (index - (card.layers.length - 1) / 2) * 1.25 : 0;
      mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, spread + parallax.x, reduced ? 1 : 0.12);
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, parallax.y, reduced ? 1 : 0.12);
      contracts.current[index]?.setAttribute("data-parallax-x", mesh.position.x.toFixed(4));
      contracts.current[index]?.setAttribute("data-parallax-y", mesh.position.y.toFixed(4));
    });
  });

  return <group ref={root}>
    <mesh position-z={-0.006} visible={!exploded}>
      <planeGeometry args={[2.15, 3]} />
      <meshBasicMaterial map={textures[0]} transparent alphaTest={0.01} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
    {card.layers.map((layer, index) => <mesh
      key={layer.id}
      position={[exploded ? (index - (card.layers.length - 1) / 2) * 1.25 : 0, 0, 0.012 + layer.depthMm * 0.04]}
      renderOrder={index + 1}
    >
      <planeGeometry args={[2.15, 3]} />
      <meshBasicMaterial map={textures[index + 1]} transparent alphaTest={0.01} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>)}
  </group>;
}

export function PokemonCardStage({ card, reduced, view, texturesReady, onTexturesReady }: {
  card: CardTwinCard;
  reduced: boolean;
  view: "gallery" | "macro" | "side";
  texturesReady: boolean;
  onTexturesReady: () => void;
}) {
  const exploded = view === "side";
  const contracts = useRef<Array<HTMLSpanElement | null>>([]);
  return <section
    data-testid="pokemon-card-webgl-stage"
    data-renderer="three-webgl"
    data-view={view}
    data-card-id={card.id}
    data-card-printing={`${card.name} · ${card.set} · ${card.printing}`}
    data-hidden-fill={card.hiddenFill}
    data-textures-ready={String(texturesReady)}
    data-camera-anchor={view === "gallery" ? "gallery" : `${card.id}-inspection`}
    data-camera-transition={reduced ? "instant" : view === "gallery" ? "idle" : "settled"}
    className="webgl-stage"
    aria-label={`Exact ${card.name} ${card.printing} layered CardTwin construction`}
  >
    <div className="webgl-contracts" aria-hidden="true">
      {card.layers.map((layer, index) => <span
        key={layer.id}
        ref={(node) => { contracts.current[index] = node; }}
        data-layer-id={layer.id}
        data-layer-depth={layer.depthMm}
        data-layer-texture={layer.texture}
        data-parallax-x="0"
        data-parallax-y="0"
      />)}
    </div>
    <Canvas orthographic dpr={[1, 2]} camera={{ position: [0, 0, 10], zoom: 138, near: 0.08, far: 30 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
      <color attach="background" args={["#14211f"]} />
      <ambientLight intensity={1.1} />
      <ResponsiveCamera view={view} />
      <Suspense fallback={null}>
        <LayeredCard key={card.id} card={card} reduced={reduced} exploded={exploded} contracts={contracts} onReady={onTexturesReady} />
      </Suspense>
    </Canvas>
  </section>;
}