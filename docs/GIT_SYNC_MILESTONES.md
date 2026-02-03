# Collection Git Remote Sync — Milestones

This document breaks the [Collection Git Remote Sync](docs/ARCHITECTURE.md) feature into **milestones** so implementation can be done incrementally and resumed at any point.

---

## Overview

| Milestone | Goal | Can stop after |
|-----------|------|-----------------|
| **M1** | Data model for Git remote | Types extended; settings persist (no UI) |
| **M2** | Core sync logic | Push collection subtree to Git works from main process |
| **M3** | IPC and wiring | Renderer can invoke sync via API |
| **M4** | Settings UI | User can set remote URL/branch and click Sync in settings |
| **M5** | Context menu | User can right-click collection → "Sync to remote" |
| **M6** | Polish (optional) | lastSyncedAt, better errors, docs |
| **Pull** | Pull from remote | User can pull collection from Git (Collection Settings + context menu) |

---

## Milestone 1: Types and settings model

**Goal:** Collection can store an optional Git remote (URL, branch) in its settings. No UI yet.

**Tasks:**

1. In [`src/core/types.ts`](src/core/types.ts), add to `CollectionSettings`:
   - `gitRemote?: { url: string; branch?: string }`
2. Ensure existing `getCollectionSettings` / `updateCollectionSettings` and storage persist this (they already persist the full `settings` object, so no storage change needed).
3. Optionally add a short comment in types that `gitRemote` is used for syncing the collection to a Git/Bitbucket repo.

**Verification:** Unit test or manual check: update settings with `gitRemote: { url: 'https://example.com/repo.git', branch: 'main' }`, reload, confirm it round-trips. No UI changes yet.

**Resume point:** After M1 you have the data model; all later milestones assume this exists.

---

## Milestone 2: Core Git sync module

**Goal:** A core module can clone/fetch a repo and push a serialized collection subtree to it. No IPC or UI.

**Tasks:**

1. Add dependency: `simple-git` (and `@types/simple-git` if needed) in [`package.json`](package.json).
2. Create [`src/core/collection-git-sync.ts`](src/core/collection-git-sync.ts) (or `git-sync.ts`) with:
   - **getOrCloneRepo(remoteUrl, branch, cacheDir):** If `cacheDir` exists and is a Git repo with that remote, run `fetch` and checkout branch; else `clone` into `cacheDir`, checkout branch. Return working dir path.
   - **pushCollectionSubtree(collectionNode, repoPath, fileName):** Serialize `collectionNode` (and its `children`) to JSON, write to `repoPath/fileName`, then `add`, `commit` (e.g. "Sync collection from REST Client"), `push`.
3. Decide and document: file name in repo (e.g. `collection.json`) and cache dir layout (e.g. `userData/git-cache/<collectionId>`).
4. Export a single high-level function if desired, e.g. **syncCollectionToRemote(userDataPath, collectionId)** that:
   - Loads collections config, finds node by id, reads `node.settings?.gitRemote`;
   - Resolves cache path; calls getOrCloneRepo then pushCollectionSubtree;
   - Returns `{ success: boolean; message?: string }` and maps errors to user-friendly messages where possible.

**Verification:** Call the high-level function from a small script or test with a real/mock repo; confirm file appears and push succeeds. Main process only; no IPC yet.

**Resume point:** After M2 you have working sync in core; M3 only adds IPC.

---

## Milestone 3: IPC and main process

**Goal:** Renderer can trigger sync by collection ID via IPC.

**Tasks:**

1. In [`src/main/ipc-handlers.ts`](src/main/ipc-handlers.ts):
   - Add handler `collection:syncToRemote` with arg `collectionId: string`.
   - Load tree, find node, get settings; if no `gitRemote?.url`, return `{ success: false, message: '...' }`.
   - Resolve cache path (e.g. `path.join(userDataPath, 'git-cache', collectionId)`), call core sync function, return result.
2. In [`src/main/preload.ts`](src/main/preload.ts): Expose `syncCollectionToRemote(collectionId: string) => Promise<{ success: boolean; message?: string }>`.
3. In [`src/renderer/types/electron.d.ts`](src/renderer/types/electron.d.ts) (or wherever `ElectronAPI` is declared): Add the same signature to the API type.

**Verification:** From renderer (e.g. DevTools console), call `window.electronAPI.syncCollectionToRemote('some-id')` for a collection that has `gitRemote` set (e.g. via a temporary test that updates settings). Confirm sync runs and returns success/failure.

**Resume point:** After M3 the full sync path works from UI-ready API; M4 and M5 only add UI.

---

## Milestone 4: Collection settings UI

**Goal:** User can configure Git remote and run Sync from the Collection Settings panel.

**Tasks:**

1. In [`src/renderer/components/CollectionSettings/CollectionSettingsEditor.tsx`](src/renderer/components/CollectionSettings/CollectionSettingsEditor.tsx):
   - Add a **"Remote repository (Git)"** section with:
     - **Remote URL** (text input), e.g. `https://bitbucket.org/workspace/repo.git`.
     - **Branch** (optional text input), placeholder e.g. `main`.
   - Include `gitRemote` in local state and in `handleSave` (merge into `settings` when saving).
   - Add **"Sync to remote"** button: enabled when `settings?.gitRemote?.url` is non-empty; on click call `window.electronAPI.syncCollectionToRemote(collectionId)`, show loading state, then toast success or error from result.
2. Optional: simple validation (URL starts with `http://`, `https://`, or `git@`) before enabling Sync or on save.

**Verification:** Open a collection’s settings, set URL (and optionally branch), save. Click "Sync to remote" and confirm toast and remote repo state.

**Resume point:** After M4 users can sync from settings; M5 adds the context menu shortcut.

---

## Milestone 5: Context menu and sidebar

**Goal:** User can right-click a collection and choose "Sync to remote" when a remote is configured.

**Tasks:**

1. In [`src/renderer/components/Sidebar/ContextMenu.tsx`](src/renderer/components/Sidebar/ContextMenu.tsx):
   - Add `'sync-to-remote'` to the `ContextMenuAction` type.
   - For **collections only**, when `node.settings?.gitRemote?.url` is set: add a menu item "Sync to remote" that triggers `'sync-to-remote'` (e.g. after "Settings", with a separator).
2. In [`src/renderer/components/Sidebar/Collections.tsx`](src/renderer/components/Sidebar/Collections.tsx):
   - Add prop `onSyncToRemote?: (collectionId: string) => void`.
   - In `handleContextMenuAction`, handle `'sync-to-remote'`: call `onSyncToRemote?.(node.id)`.
3. In [`src/renderer/App.tsx`](src/renderer/App.tsx):
   - Implement `handleSyncToRemote(collectionId)`: call `syncCollectionToRemote(collectionId)`, refresh collections tree on success, show toast.
   - Pass `onSyncToRemote={handleSyncToRemote}` to the sidebar/Collections component.

**Verification:** Right-click a collection that has a Git remote set; choose "Sync to remote"; confirm sync runs and toast appears.

**Resume point:** After M5 the feature is complete for the "sync on click" approach.

---

## Pull from remote (implemented)

In addition to **push** (sync to remote), the app supports **pull from remote**: the user can pull the latest collection JSON from the configured Git remote and merge it into the local collection. This is available from Collection Settings ("Pull from remote") and from the sidebar context menu ("Pull from remote") when a Git remote is configured. Core API: `pullCollectionFromRemote(userDataPath, collectionId)`; IPC: `collection:pullFromRemote`.

---

## Milestone 6: Polish (optional)

**Goal:** Better UX and documentation for Git sync.

**Tasks:**

1. **Sync status:** Optionally store `lastSyncedAt?: string` (ISO) in collection settings when sync succeeds; show "Last synced: …" in Collection Settings or a small indicator in the sidebar.
2. **Error messages:** Map common Git errors (auth failed, network, push rejected) to clear, user-facing toasts or inline message in the settings panel.
3. **Docs:** In [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) or README, add a short note that "Sync to remote" requires Git on PATH and uses system credentials; mention `userData/git-cache` for debugging.

**Verification:** Manual check of error cases and that docs are accurate.

---

## File checklist (by milestone)

| File | M1 | M2 | M3 | M4 | M5 | M6 |
|------|----|----|----|----|----|-----|
| `src/core/types.ts` | ✓ | | | | | |
| `package.json` | | ✓ | | | | |
| `src/core/collection-git-sync.ts` | | ✓ | | | | |
| `src/main/ipc-handlers.ts` | | | ✓ | | | |
| `src/main/preload.ts` | | | ✓ | | | |
| `src/renderer/types/electron.d.ts` | | | ✓ | | | |
| `CollectionSettingsEditor.tsx` | | | | ✓ | | |
| `ContextMenu.tsx` | | | | | ✓ | |
| `Collections.tsx` | | | | | ✓ | |
| `App.tsx` | | | | | ✓ | |
| Docs / lastSyncedAt / errors | | | | | | ✓ |

---

## Resuming implementation

- Start from **Milestone 1** if you haven’t touched the feature yet.
- If you already have types (M1) and core sync (M2), resume at **Milestone 3**.
- If IPC and settings UI are done (M3–M4), resume at **Milestone 5** for the context menu.
- Use the **File checklist** to see which files each milestone touches.
