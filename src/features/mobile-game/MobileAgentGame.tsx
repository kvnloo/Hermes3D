"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import { createGameCoordinator, createGameHistoryBridge, type GameRoot, type GameRoute } from "./navigation";
import { createFixtureTruthAdapter, type FixtureTaskStatus } from "./truthAdapter";
import styles from "./mobileAgentGame.module.css";

type Selection = { type: "site" | "agent" | "gate"; id: string; title: string; detail: string };
const sites: Selection[] = [
  { type: "site", id: "hermes3d", title: "Hermes3D studio", detail: "Private product lane · prototype active" },
  { type: "site", id: "dim0-company", title: "Dim0 company", detail: "Worksite · queued interface planning" },
  { type: "site", id: "homebase", title: "Homebase", detail: "District · no active fixture work" },
];
const agents: Selection[] = [
  { type: "agent", id: "agent-atlas", title: "Atlas", detail: "Available · synthetic fixture" },
  { type: "agent", id: "agent-river", title: "River", detail: "Running · synthetic fixture" },
  { type: "agent", id: "agent-moss", title: "Moss", detail: "Waiting · synthetic fixture" },
];
const statusLabel: Record<FixtureTaskStatus, string> = { queued: "Queued", running: "Running", review: "Ready for review" };

function Courtyard({ onSelect, taskStatus }: { onSelect: (item: Selection) => void; taskStatus: FixtureTaskStatus }) {
  const siteMaterials = useMemo(() => ["#c97a42", "#66988b", "#d5aa58"], []);
  return (
    <>
      <color attach="background" args={["#9eb5a7"]} />
      <ambientLight intensity={1.8} />
      <directionalLight position={[5, 9, 4]} intensity={2.2} color="#fff4d5" />
      <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[22, 18]} /><meshStandardMaterial color="#819a72" roughness={0.95} /></mesh>
      {sites.map((site, index) => (
        <group key={site.id} position={[-5 + index * 5, 0, index === 1 ? -1 : 1]}>
          <mesh position-y={1.1} castShadow onClick={(event) => { event.stopPropagation(); onSelect(site); }}>
            <boxGeometry args={[3.2, 2.2 + index * 0.35, 3]} />
            <meshStandardMaterial color={siteMaterials[index]} roughness={0.78} />
          </mesh>
          {index === 1 && <mesh position={[0, 2.75, 0]} rotation-z={Math.PI / 4}><boxGeometry args={[1.2, 1.2, 1.2]} /><meshStandardMaterial color="#f1d6a4" wireframe /></mesh>}
        </group>
      ))}
      {agents.map((agent, index) => (
        <group key={agent.id} position={[-2.8 + index * 2.8, 0, 4]} onClick={(event) => { event.stopPropagation(); onSelect(agent); }}>
          <mesh position-y={0.75}><capsuleGeometry args={[0.38, 0.8, 6, 10]} /><meshStandardMaterial color={["#e9c46a", "#eb8f68", "#5d8298"][index]} /></mesh>
          <mesh position-y={1.65}><sphereGeometry args={[0.38, 16, 12]} /><meshStandardMaterial color="#f3d7bd" /></mesh>
        </group>
      ))}
      <group position={[5.5, 0, 4]} onClick={(event) => { event.stopPropagation(); onSelect({ type: "gate", id: "review-mobile-shell", title: "Review gate", detail: `${statusLabel[taskStatus]} · synthetic evidence` }); }}>
        <mesh position={[-0.9, 1.2, 0]}><boxGeometry args={[0.35, 2.4, 0.45]} /><meshStandardMaterial color="#425b56" /></mesh>
        <mesh position={[0.9, 1.2, 0]}><boxGeometry args={[0.35, 2.4, 0.45]} /><meshStandardMaterial color="#425b56" /></mesh>
        <mesh position={[0, 2.25, 0]}><boxGeometry args={[2.15, 0.35, 0.45]} /><meshStandardMaterial color="#425b56" /></mesh>
      </group>
      <OrbitControls makeDefault enablePan={false} minDistance={8} maxDistance={18} minPolarAngle={0.65} maxPolarAngle={1.25} target={[0, 0.8, 1]} />
    </>
  );
}

export function MobileAgentGame() {
  const adapter = useMemo(() => createFixtureTruthAdapter(), []);
  const coordinator = useMemo(() => createGameCoordinator(), []);
  const [truth, setTruth] = useState(adapter.snapshot());
  const [route, setRoute] = useState<GameRoute>(coordinator.current());
  const bridge = useMemo(() => typeof window === "undefined" ? null : createGameHistoryBridge(coordinator, window, () => setRoute(coordinator.current())), [coordinator]);
  const task = truth.tasks[0];
  useEffect(() => { bridge?.start(); return () => bridge?.stop(); }, [bridge]);
  const selection = route.kind === "root" ? null
    : route.kind === "site" ? sites.find((item) => item.id === route.id) ?? null
    : route.kind === "agent" ? agents.find((item) => item.id === route.id) ?? null
    : route.kind === "task" ? sites[1]
    : { type: "gate" as const, id: route.id, title: "Review gate", detail: `${statusLabel[task.status]} · synthetic evidence` };
  const navigate = (next: GameRoute) => {
    if (!coordinator.push(next)) return;
    bridge?.commit("push");
    setRoute(coordinator.current());
  };
  const select = (item: Selection) => navigate(item.type === "site"
    ? { version: 1, root: "world", kind: "site", id: item.id }
    : item.type === "agent"
      ? { version: 1, root: "agents", kind: "agent", id: item.id }
      : { version: 1, root: "review", kind: "review", id: item.id });
  const closeInspector = () => {
    if (!coordinator.pop()) return;
    bridge?.commit("replace");
    setRoute(coordinator.current());
  };
  const advance = () => {
    if (task.status === "queued") {
      adapter.issue({ version: 1, commandId: "cmd-mobile-001", action: "assign", taskId: task.id, agentId: "agent-atlas" });
      adapter.applyEvidence({ version: 1, evidenceId: "ev-running-001", taskId: task.id, status: "running" });
    } else if (task.status === "running") {
      adapter.applyEvidence({ version: 1, evidenceId: "ev-review-001", taskId: task.id, status: "review" });
    }
    setTruth(adapter.snapshot());
  };

  return (
    <main className={styles.shell} data-testid="game-shell">
      <a className={styles.skip} href="#game-panel">Skip to settlement controls</a>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>Synthetic evidence · private</span><h1>Company courtyard</h1></div>
        <div className={styles.freshness}><span aria-hidden="true">◆</span> observed 18:00 UTC</div>
      </header>
      <section className={styles.world} aria-label="Interactive company settlement">
        <Canvas camera={{ position: [9, 10, 13], fov: 38 }} dpr={[1, 1.5]} shadows={false}>
          <Courtyard onSelect={select} taskStatus={task.status} />
        </Canvas>
        <div className={styles.legend}><b>{statusLabel[task.status]}</b><span>{task.title}</span></div>
      </section>
      <aside id="game-panel" className={`${styles.panel} ${selection ? styles.panelOpen : ""}`} aria-hidden={!selection}>
        <button className={styles.close} onClick={closeInspector} aria-label="Close inspector">×</button>
        <span className={styles.eyebrow}>{selection?.type ?? "selection"}</span>
        <h2>{selection?.title ?? "Select a worksite"}</h2>
        <p>{selection?.detail}</p>
        {selection && <dl><div><dt>Authority</dt><dd>Fixture adapter v1</dd></div><div><dt>Mutation</dt><dd>Local only</dd></div><div><dt>Source</dt><dd>docs/mobile-agent-game</dd></div></dl>}
        {selection && task.status !== "review" && <button className={styles.action} onClick={advance}>{task.status === "queued" ? "Assign Atlas locally" : "Attach review evidence"}<span aria-hidden="true">→</span></button>}
      </aside>
      <nav className={styles.dock} aria-label="Settlement sections">
        {([['world','World','⌂'],['agents','Agents','◇'],['build','Build','▥'],['review','Review','✓']] as const).map(([id, label, icon]) => <button key={id} aria-current={route.root === id ? "page" : undefined} onClick={() => {
          const contextual: Record<GameRoot, GameRoute> = {
            world: { version: 1, root: "world", kind: "root" },
            agents: { version: 1, root: "agents", kind: "agent", id: agents[0].id },
            build: { version: 1, root: "build", kind: "task", id: task.id },
            review: { version: 1, root: "review", kind: "review", id: "review-mobile-shell" },
          };
          navigate(contextual[id]);
        }}><span aria-hidden="true">{icon}</span>{label}</button>)}
      </nav>
    </main>
  );
}
