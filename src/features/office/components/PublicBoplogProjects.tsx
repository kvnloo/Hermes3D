"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { PublicBoplogProjectionV1 } from "@/lib/public-boplog/publicBoplogProjectionV1";
import type { PublicKanbanProjectionV1 } from "@/lib/public-boplog/publicKanbanProjectionV1";

export function PublicBoplogProjects({ projection, kanbanProjection }: { projection: PublicBoplogProjectionV1 | null; kanbanProjection: PublicKanbanProjectionV1 | null }) {
  const pageCount = projection ? Math.ceil(projection.entries.length / projection.pageSize) : 0;
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (pageCount < 2) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const timer = window.setInterval(() => setPage((current) => (current + 1) % pageCount), 12000);
    return () => window.clearInterval(timer);
  }, [pageCount]);

  const visibleEntries = useMemo(() => {
    if (!projection) return [];
    const start = page * projection.pageSize;
    return projection.entries.slice(start, start + projection.pageSize);
  }, [page, projection]);

  if (!projection) return null;
  const kanbanById = new Map(kanbanProjection?.entries.map((entry) => [entry.publicId, entry]) ?? []);

  return (
    <aside aria-label="Published public Boplog projects" className="fixed right-3 top-20 z-20 w-[min(22rem,calc(100vw-1.5rem))] rounded-lg border border-cyan-400/25 bg-[#05090d]/88 px-3 py-2.5 font-mono text-white shadow-2xl backdrop-blur-md sm:right-4 sm:top-4 sm:px-4 sm:py-3">
      <div className="flex items-start justify-between gap-3 border-b border-cyan-300/15 pb-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-200/75">Public projects</p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-white">From Boplog</h2>
        </div>
        <p className="max-w-32 text-right text-[9px] leading-3.5 text-white/55">Published public information only</p>
      </div>
      <ol className="mt-2 space-y-2" aria-live="off">
        {visibleEntries.map((entry) => {
          const snapshot = kanbanById.get(entry.publicId);
          return (
          <li key={entry.publicId} className="border-l border-cyan-300/20 pl-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-semibold text-white/90">{entry.displayName}</span>
              <span className="shrink-0 text-[8px] uppercase tracking-[0.1em] text-cyan-100/50">{entry.kind}</span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[9px] leading-3.5 text-white/50">{entry.summary}</p>
            <div className="mt-1 flex items-center justify-between gap-2 text-[8px] leading-3 text-white/35">
              <span>{snapshot ? `Kanban: ${snapshot.counts.completed} completed / ${snapshot.counts.total} total${snapshot.counts.blocked ? ` / ${snapshot.counts.blocked} blocked` : ""}` : "Kanban snapshot: Summary unavailable"}</span>
              <span className="shrink-0">Published aggregate only</span>
            </div>
            <a className="pointer-events-auto mt-1 inline-flex items-center gap-1 text-[9px] text-cyan-200/75 hover:text-cyan-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan-200" href={entry.urls[0]} target="_blank" rel="noreferrer">Public link <ExternalLink aria-hidden="true" size={10} strokeWidth={1.5} /></a>
          </li>
          );
        })}
      </ol>
      <div className="mt-2 flex items-center justify-between border-t border-cyan-300/10 pt-1.5 text-[8px] text-white/35">
        <span>{projection.entries.length} allowlisted entries</span>
        <span>Page {page + 1} / {pageCount}</span>
      </div>
    </aside>
  );
}
