"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchMuseum, type MuseumSearchFilter, type MuseumSearchRecordV1 } from "../core/MuseumSearchV1";

export function MuseumSearch({ records }: { records: readonly MuseumSearchRecordV1[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filters] = useState<readonly MuseumSearchFilter[]>([]);
  const [active, setActive] = useState(0);
  const results = useMemo(() => {
    try { return searchMuseum(records, query, filters); } catch { return []; }
  }, [records, query, filters]);

  const close = () => {
    setOpen(false);
    window.requestAnimationFrame(() => returnFocus.current?.focus());
  };
  const show = () => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const editable = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable);
      if ((event.key === "/" && !editable) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        show();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);


  const navigate = (result: MuseumSearchRecordV1 | undefined) => {
    if (!result) return;
    close();
    router.push(result.href);
  };

  return (
    <>
      <button type="button" onClick={show} className="museum-search-trigger" aria-haspopup="dialog">
        <span>Find an exhibit</span><kbd>/</kbd>
      </button>
      {open && (
        <div className="museum-search-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section className="museum-search" role="dialog" aria-modal="true" aria-label="Search the public museum index">
            <label htmlFor={`${listId}-input`}>Search public exhibits and destinations</label>
            <input
              id={`${listId}-input`}
              ref={inputRef}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0); }}
              onKeyDown={(event) => {
                if (event.key === "Escape") { event.preventDefault(); close(); }
                if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, results.length - 1)); }
                if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); }
                if (event.key === "Enter") { event.preventDefault(); navigate(results[active]); }
              }}
              placeholder="Exhibit, collection, destination"
              autoComplete="off"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            />
            <div id={listId} role="listbox" aria-label="Museum search results">
              {results.map((result, index) => (
                <button id={`${listId}-${index}`} role="option" aria-selected={active === index} type="button" key={result.id} onMouseMove={() => setActive(index)} onClick={() => navigate(result)}>
                  <span>{result.title}</span><small>{result.summary}</small>
                </button>
              ))}
              {!results.length && <p className="museum-search-empty">No public destinations match this search.</p>}
            </div>
            <button type="button" className="museum-search-close" onClick={close}>Close</button>
          </section>
        </div>
      )}
    </>
  );
}
