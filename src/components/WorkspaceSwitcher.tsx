import { useCallback, useEffect, useState } from "react";

import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
  switchWorkspace,
  type WorkspaceManifest,
} from "../lib/tauri";
import styles from "./WorkspaceSwitcher.module.css";

type WorkspaceSwitcherProps = {
  currentWorkspaceId: string;
  onWorkspaceSwitch: (workspaceId: string) => void;
};

export function WorkspaceSwitcher({
  currentWorkspaceId,
  onWorkspaceSwitch,
}: WorkspaceSwitcherProps) {
  const [manifest, setManifest] = useState<WorkspaceManifest | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const refresh = useCallback(async () => {
    const m = await listWorkspaces();
    setManifest(m);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSwitch = useCallback(
    async (workspaceId: string) => {
      const updated = await switchWorkspace(workspaceId);
      setManifest(updated);
      setIsOpen(false);
      onWorkspaceSwitch(workspaceId);
    },
    [onWorkspaceSwitch],
  );

  const handleCreate = useCallback(async () => {
    const name = newName.trim() || `Workspace ${(manifest?.workspaces.length ?? 0) + 1}`;
    const updated = await createWorkspace(name);
    setManifest(updated);
    setNewName("");
    setIsCreating(false);
    setIsOpen(false);
    onWorkspaceSwitch(updated.currentWorkspaceId);
  }, [newName, manifest, onWorkspaceSwitch]);

  const handleDelete = useCallback(
    async (workspaceId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = await deleteWorkspace(workspaceId);
      setManifest(updated);
      if (updated.currentWorkspaceId !== currentWorkspaceId) {
        onWorkspaceSwitch(updated.currentWorkspaceId);
      }
    },
    [currentWorkspaceId, onWorkspaceSwitch],
  );

  const currentName =
    manifest?.workspaces.find((w) => w.id === currentWorkspaceId)?.name ?? "Default";

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        title="Switch workspace"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
          <rect x="9" y="9" width="5" height="5" rx="1" />
        </svg>
        <span>{currentName}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown} data-testid="workspace-dropdown">
          <ul className={styles.list}>
            {manifest?.workspaces.map((ws) => (
              <li
                key={ws.id}
                className={`${styles.item}${ws.id === currentWorkspaceId ? ` ${styles.active}` : ""}`}
                onClick={() => void handleSwitch(ws.id)}
              >
                <span>{ws.name}</span>
                {ws.id !== "default" && (
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={(e) => void handleDelete(ws.id, e)}
                    title="Delete workspace"
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>

          {isCreating ? (
            <div className={styles.createRow}>
              <input
                className={styles.createInput}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                  if (e.key === "Escape") setIsCreating(false);
                }}
                placeholder="Workspace name"
                autoFocus
              />
              <button type="button" className={styles.createBtn} onClick={() => void handleCreate()}>
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.newWorkspaceBtn}
              onClick={() => setIsCreating(true)}
            >
              + New Workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
}
