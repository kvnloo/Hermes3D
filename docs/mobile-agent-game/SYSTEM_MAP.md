# Current-system map and v1 seams

| Surface | Owner / entry | Mobile finding |
|---|---|---|
| Office / 3D HQ | `OfficeScreen.tsx`, `RetroOffice3D.tsx`, `/office` | one large immersive owner; many local overlays/states |
| Agents | `AgentsPageScreen.tsx`; `/agents` redirects | explicit Fleet/Chat mobile pane |
| Kanban/tasks | `KanbanImmersiveScreen.tsx`, `TaskBoardView.tsx` | execution projection embedded in immersive UI |
| Projects/reviews/evidence | `GithubImmersiveScreen.tsx` | dense live mutation surface; excluded from prototype |
| Builders | `CompanyBuilderModal.tsx`, `OfficeBuilderPanel.tsx`, `/office/builder` | fixed `h-screen`, 1600×900 assumptions |
| Communications | `InboxPanel.tsx`, `AgentChatPanel.tsx`, standup | keyboard/scroll-heavy; resize/scroll rAF seams |
| Skills/settings | office panels | modal state without unified URL stack |
| Museum/display | office immersive objects | presentation, not authority |
| Stream overlays | `PublicLiveStatus.tsx` | separate rAF heartbeat projection |

Only seven `page.tsx` routes exist; most office navigation is React state, not history. Root layout used `h-screen` (`src/app/layout.tsx:44`); source CSS had almost no systematic safe-area/dvh/touch contract.

New seam: `/office/game` → `MobileAgentGame` → one R3F Canvas → fixture truth adapter. `navigation.ts` remains framework independent. Production adapters later subscribe to a versioned read model; they never import React, Three, WebSocket, or Kanban implementation into the coordinator.
