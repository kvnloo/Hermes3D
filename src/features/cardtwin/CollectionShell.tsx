import Link from "next/link";
import type { ReactNode } from "react";
import "./collection.css";

export function CollectionShell({ active, children }: { active: "pokedex" | "cards"; children: ReactNode }) {
  return <main className="ct-app">
    <header className="ct-topbar"><Link href="/pokedex" className="ct-brand"><i aria-hidden="true" /><span>CardTwin</span></Link><span className="ct-source">Verified catalog</span></header>
    <div className="ct-content">{children}</div>
    <nav className="ct-bottom-nav" aria-label="Collection navigation">
      <Link href="/pokedex" aria-current={active === "pokedex" ? "page" : undefined}><b>◉</b><span>Pokédex</span></Link>
      <Link href="/cards" aria-current={active === "cards" ? "page" : undefined}><b>▤</b><span>Cards</span></Link>
      <button type="button" disabled title="Coming later"><b className="ct-scan">＋</b><span>Scan</span><small>Later</small></button>
      <button type="button" disabled title="Coming later"><b>○</b><span>Profile</span><small>Later</small></button>
    </nav>
  </main>;
}

export function CatalogError({ title = "Catalog unavailable" }: { title?: string }) {
  return <section className="ct-state" role="status"><strong>{title}</strong><p>The verified source could not be reached. Try again when your connection returns.</p><a href="">Retry</a></section>;
}
