import Link from "next/link";
import { CollectionShell, CatalogError } from "@/features/cardtwin/CollectionShell";
import { buildCatalogHref, parseCatalogQuery } from "@/features/cardtwin/catalogQuery";
import { tcgdexProvider } from "@/features/cardtwin/providers/tcgdex";

export default async function CardsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseCatalogQuery(await searchParams);
  let page;
  try { page = await tcgdexProvider.list(query); } catch { return <CollectionShell active="cards"><CatalogError title="Card catalog unavailable" /></CollectionShell>; }
  return <CollectionShell active="cards">
    <section className="ct-hero ct-card-hero"><span>Exact printings</span><h1>Card archive</h1><p>Canonical IDs, set numbers and source images. Ownership, condition and prices are intentionally absent.</p></section>
    <form className="ct-filters ct-card-filters" action="/cards"><label><span>Search cards</span><input name="q" defaultValue={query.q} placeholder="Name or exact card ID" /></label><label><span>Set</span><input name="set" defaultValue={query.set} placeholder="Set ID or exact name" /></label><label><span>Rarity</span><input name="rarity" defaultValue={query.rarity} placeholder="Exact rarity" /></label><button type="submit">Apply</button>{(query.q || query.set || query.rarity) && <Link className="ct-clear-filters" href="/cards">Clear filters</Link>}</form>
    <div className="ct-result-bar"><strong>{page.total.toLocaleString()} printings</strong><span>Page {page.page} of {page.totalPages}</span></div>
    {page.items.length ? <section className="ct-card-grid" aria-label="Card results">{page.items.map((card) => <Link href={`/cards/${encodeURIComponent(card.id)}`} key={card.id} className="ct-card-tile">{card.imageUrl ? <>{/* eslint-disable-next-line @next/next/no-img-element -- TCGdex image provenance remains exact. */}<img loading="lazy" width="245" height="342" src={card.imageUrl} alt={`${card.name}, ${card.set.name} ${card.number}`} /></> : <div className="ct-image-missing">Image unavailable</div>}<strong>{card.name}</strong><span>{card.set.name} #{card.number}</span><small>{card.rarity ?? "Rarity not listed"}</small></Link>)}</section> : <section className="ct-state"><strong>No cards found</strong><p>Try another exact card name, ID, set or rarity.</p></section>}
    <nav className="ct-pagination" aria-label="Card pages">{page.page > 1 && <Link href={buildCatalogHref("/cards", { ...query, page: page.page - 1 })}>Previous</Link>}<span>{page.page} / {page.totalPages}</span>{page.page < page.totalPages && <Link href={buildCatalogHref("/cards", { ...query, page: page.page + 1 })}>Next</Link>}</nav>
    <footer className="ct-attribution">{page.provenance.attribution} <a href={page.provenance.sourceUrl}>Source</a></footer>
  </CollectionShell>;
}
