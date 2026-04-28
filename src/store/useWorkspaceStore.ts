import { useStore } from "zustand";

import { type WorkspaceStoreState, workspaceStore } from "./workspaceStore";

export const useWorkspaceStore = <T>(selector: (state: WorkspaceStoreState) => T): T =>
  useStore(workspaceStore, selector);
