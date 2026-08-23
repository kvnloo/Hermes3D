import { notFound } from "next/navigation";
import { CollectionShell, CatalogError } from "@/features/cardtwin/CollectionShell";
import { ContextBack } from "@/features/cardtwin/ContextBack";
import { pokeApiProvider } from "@/features/cardtwin/providers/pokeApi";
import { resolvePokemonModel } from "@/features/cardtwin/pokemon3dCatalog";

export default async function PokemonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1 || id > 1025) notFound();
  let result;
  try { result = await pokeApiProvider.get(id); } catch { return <CollectionShell active="pokedex"><CatalogError title="Pokémon detail unavailable" /></CollectionShell>; }
  if (!result) notFound();
  const { record, provenance } = result;
  const model = resolvePokemonModel(record.id);
  return <CollectionShell active="pokedex"><ContextBack fallback="/pokedex" />
    <article className="ct-detail">
      <section className="ct-detail-art"><span>#{String(record.id).padStart(4, "0")}</span>{/* eslint-disable-next-line @next/next/no-img-element -- official artwork provenance. */}<img src={record.artworkUrl} alt={`${record.name} official artwork`} width="560" height="560" /></section>
      <section className="ct-detail-copy"><span>{record.region} · Generation {record.generation}</span><h1>{record.name}</h1><div className="ct-type-row">{record.types.map((type) => <b key={type}>{type}</b>)}</div><h2>Abilities</h2><p>{record.abilities.join(", ") || "Not listed by source"}</p><h2>Base stats</h2><dl className="ct-stats">{record.stats.map((stat) => <div key={stat.name}><dt>{stat.name}</dt><dd>{stat.value}</dd></div>)}</dl><h2>Evolution</h2>{record.evolution.length ? <ol className="ct-evolution">{record.evolution.map((entry) => <li key={entry.id}><a href={`/pokedex/${entry.id}`}>#{entry.id} {entry.name}</a></li>)}</ol> : <p>No evolution chain listed by source.</p>}</section>
    </article>
    <section className="ct-model-panel"><div><span>Approved model catalog v1</span><h2>3D view</h2><p>{model ? `${model.attribution}. ${model.license}` : "3D model unavailable"}</p></div>{model ? <div data-model-url={model.modelUrl}>Approved model viewer</div> : <div className="ct-model-empty">Official artwork remains the only visual source for this Pokémon.</div>}</section>
    <footer className="ct-attribution">{provenance.attribution} <a href={provenance.sourceUrl}>Source</a></footer>
  </CollectionShell>;
}
