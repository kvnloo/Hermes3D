"use client";

import type { CompanyDirectoryV1 } from "@/lib/public-directory/companyDirectoryV1";

type PublicCompanyDirectoryProps = {
  directory: CompanyDirectoryV1 | null;
};

export function PublicCompanyDirectory({ directory }: PublicCompanyDirectoryProps) {
  return (
    <aside
      aria-label="Public company directory"
      className="pointer-events-none fixed left-3 top-3 z-20 w-[min(25rem,calc(100vw-1.5rem))] rounded-lg border border-cyan-400/25 bg-[#05090d]/88 px-3 py-2.5 font-mono text-white shadow-2xl backdrop-blur-md sm:left-4 sm:top-4 sm:px-4 sm:py-3"
    >
      <div className="flex items-start justify-between gap-3 border-b border-cyan-300/15 pb-2">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-200/75">
            Public directory preview
          </p>
          <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
            {directory?.company.displayName ?? "Directory unavailable"}
          </h1>
        </div>
        <p className="max-w-36 text-right text-[9px] leading-3.5 text-white/55 sm:max-w-40 sm:text-[10px]">
          No live activity or private data
        </p>
      </div>

      {directory ? (
        <div className="mt-2 grid gap-3 sm:grid-cols-[1.2fr_1fr]">
          <section aria-labelledby="public-agent-roster-heading">
            <h2 id="public-agent-roster-heading" className="text-[9px] uppercase tracking-[0.14em] text-cyan-100/55">
              Governance roles
            </h2>
            <ol className="mt-1.5 space-y-1">
              {directory.agents.map((agent) => (
                <li key={agent.publicId} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] gap-2 text-[10px] leading-3.5">
                  <span className="truncate font-semibold text-white/90">{agent.displayName}</span>
                  <span className="truncate text-white/50">{agent.roleLabel}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="mesh-topology-heading" className="border-t border-cyan-300/10 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
            <h2 id="mesh-topology-heading" className="text-[9px] uppercase tracking-[0.14em] text-cyan-100/55">
              Mesh topology preview
            </h2>
            <p className="mt-0.5 text-[8px] leading-3 text-white/40">
              Static directory - no live connectivity data
            </p>
            <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 text-[10px] leading-3.5">
              <span className="row-span-2 rounded border border-cyan-300/20 bg-cyan-300/5 px-2 py-1 font-semibold text-cyan-100">0</span>
              <span className="border-l border-cyan-300/20 pl-2 text-white/75">mbp</span>
              <span className="border-l border-cyan-300/20 pl-2 text-white/75">Telegram Gateway</span>
            </div>
          </section>
        </div>
      ) : null}

      <p className="mt-2 border-t border-cyan-300/10 pt-1.5 text-[8px] leading-3 text-white/35">
        Mesh: transport | Kanban: lifecycle authority | Keel: authorization and evidence | Live backend: disconnected
      </p>
    </aside>
  );
}
