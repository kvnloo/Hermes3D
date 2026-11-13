import Link from "next/link";
import { CollectionShell, CatalogError } from "@/features/cardtwin/CollectionShell";
import { buildCatalogHref, parseCatalogQuery } from "@/features/cardtwin/catalogQuery";
import { pokeApiProvider } from "@/features/cardtwin/providers/pokeApi";

const TYPES = ["", "fire", "water", "grass", "electric", "psychic", "dark", "fairy"];

export default async function PokedexPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseCatalogQuery(await searchParams);
  let page;
  try { page = await pokeApiProvider.list(query); } catch { return <CollectionShell active="pokedex"><CatalogError title="Pokédex unavailable" /></CollectionShell>; }
  return <CollectionShell active="pokedex">
    <section className="ct-hero"><span>National index</span><h1>Your Pokédex</h1><p>Official artwork and source-backed species data. No collection status is assumed.</p></section>
    <form className="ct-filters" action="/pokedex">
      <label><span>Search</span><input name="q" defaultValue={query.q} placeholder="Name or National Dex number" /></label>
      <label><span>Generation</span><select name="generation" defaultValue={query.generation ?? ""}><option value="">All regions</option>{Array.from({ length: 9 }, (_, index) => <option key={index + 1} value={index + 1}>Generation {index + 1}</option>)}</select></label>
      <label><span>Type</span><select name="type" defaultValue={query.type ?? ""}>{TYPES.map((type) => <option key={type || "all"} value={type}>{type ? type[0].toUpperCase() + type.slice(1) : "All types"}</option>)}</select></label>
      <button type="submit">Apply</button>
      {(query.q || query.generation || query.type) && <Link className="ct-clear-filters" href="/pokedex">Clear filters</Link>}
    </form>
    <div className="ct-result-bar"><strong>{page.total.toLocaleString()} Pokémon</strong><span>Page {page.page} of {page.totalPages}</span></div>
    {page.items.length ? <section className="ct-pokemon-grid" aria-label="Pokémon results">{page.items.map((pokemon) => <Link href={`/pokedex/${pokemon.id}`} key={pokemon.id} className="ct-pokemon-card">
      <span>#{String(pokemon.id).padStart(4, "0")}</span>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote official artwork URL is source provenance. */}<img loading="lazy" width="240" height="240" src={pokemon.artworkUrl} alt={`${pokemon.name} official artwork`} />
      <strong>{pokemon.name}</strong><small>{pokemon.region}</small>
    </Link>)}</section> : <section className="ct-state"><strong>No Pokémon found</strong><p>Clear a filter or try another name or National Dex number.</p></section>}
    <nav className="ct-pagination" aria-label="Pokédex pages">{page.page > 1 && <Link href={buildCatalogHref("/pokedex", { ...query, page: page.page - 1 })}>Previous</Link>}<span>{page.page} / {page.totalPages}</span>{page.page < page.totalPages && <Link href={buildCatalogHref("/pokedex", { ...query, page: page.page + 1 })}>Next</Link>}</nav>
    <footer className="ct-attribution">{page.provenance.attribution} <a href={page.provenance.sourceUrl}>Source</a></footer>
  </CollectionShell>;
}
