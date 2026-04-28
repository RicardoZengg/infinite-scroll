import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HelpOverlay } from "./components/HelpOverlay";
import { WorkspaceCanvas } from "./components/WorkspaceCanvas";
import { detectInitialLanguage, getTexts, persistLanguage, type AppLanguage } from "./i18n";
import { loadState, saveState } from "./lib/tauri";
import { workspaceStore, type WorkspaceStoreState } from "./store/workspaceStore";
import { useWorkspaceStore } from "./store/useWorkspaceStore";
import { useSessionOrchestrator } from "./hooks/useSessionOrchestrator";
import type { AppState } from "./types/workspace";

type IdleDeadlineLike = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadlineLike) => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const toPersistedState = (state: WorkspaceStoreState): AppState => ({
  rows: state.rows,
  nextRowIndex: state.nextRowIndex,
  fontSize: state.fontSize,
  focusedCellId: state.focusedCellId,
});

const sameSnapshot = (left: AppState | null, right: AppState | null): boolean =>
  !!left &&
  !!right &&
  left.rows === right.rows &&
  left.nextRowIndex === right.nextRowIndex &&
  left.fontSize === right.fontSize &&
  left.focusedCellId === right.focusedCellId;

const sameStringArray = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
};

function App() {
  const [language, setLanguage] = useState<AppLanguage>(() => detectInitialLanguage());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeRowIds, setActiveRowIds] = useState<string[]>([]);

  const hydrationDoneRef = useRef(false);
  const queuedSnapshotRef = useRef<AppState | null>(null);
  const lastSavedSnapshotRef = useRef<AppState | null>(null);
  const idleHandleRef = useRef<number | null>(null);
  const timeoutHandleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rows = useWorkspaceStore((state) => state.rows);
  const focusedCellId = useWorkspaceStore((state) => state.focusedCellId);
  const replaceState = useWorkspaceStore((state) => state.replaceState);
  const addRowBelowFocused = useWorkspaceStore((state) => state.addRowBelowFocused);
  const duplicateFocusedTerminal = useWorkspaceStore((state) => state.duplicateFocusedTerminal);
  const toggleHelp = useWorkspaceStore((state) => state.toggleHelp);
  const closeHelp = useWorkspaceStore((state) => state.closeHelp);
  const isHelpOpen = useWorkspaceStore((state) => state.isHelpOpen);
  const setTerminalStatus = useWorkspaceStore((state) => state.setTerminalStatus);

  const texts = useMemo(() => getTexts(language), [language]);

  useSessionOrchestrator(
    rows,
    activeRowIds,
    focusedCellId,
    setTerminalStatus,
    isHydrated,
  );

  useEffect(() => {
    let active = true;

    void loadState()
      .then((loaded) => {
        if (!active) {
          return;
        }

        replaceState(loaded);
        const normalizedSnapshot = toPersistedState(workspaceStore.getState());
        lastSavedSnapshotRef.current = normalizedSnapshot;
        queuedSnapshotRef.current = normalizedSnapshot;
        hydrationDoneRef.current = true;
        setIsHydrated(true);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        hydrationDoneRef.current = true;
        setIsHydrated(true);
        setLoadError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      active = false;
    };
  }, [replaceState]);

  const flushQueuedSnapshot = useCallback(() => {
    if (idleHandleRef.current !== null) {
      const idleWindow = window as IdleWindow;
      idleWindow.cancelIdleCallback?.(idleHandleRef.current);
      idleHandleRef.current = null;
    }

    if (timeoutHandleRef.current) {
      clearTimeout(timeoutHandleRef.current);
      timeoutHandleRef.current = null;
    }

    const snapshot = queuedSnapshotRef.current;
    if (!snapshot || sameSnapshot(snapshot, lastSavedSnapshotRef.current)) {
      return;
    }

    void saveState(snapshot).then(() => {
      lastSavedSnapshotRef.current = snapshot;
    });
  }, []);

  const schedulePersist = useCallback(() => {
    if (idleHandleRef.current !== null || timeoutHandleRef.current) {
      return;
    }

    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback) {
      idleHandleRef.current = idleWindow.requestIdleCallback(
        () => {
          flushQueuedSnapshot();
        },
        { timeout: 1200 },
      );
    }

    timeoutHandleRef.current = setTimeout(() => {
      flushQueuedSnapshot();
    }, 900);
  }, [flushQueuedSnapshot]);

  useEffect(() => {
    const unsubscribe = workspaceStore.subscribe((state) => {
      if (!hydrationDoneRef.current) {
        return;
      }

      const snapshot = toPersistedState(state);
      if (sameSnapshot(snapshot, queuedSnapshotRef.current) || sameSnapshot(snapshot, lastSavedSnapshotRef.current)) {
        return;
      }

      queuedSnapshotRef.current = snapshot;
      schedulePersist();
    });

    return () => {
      unsubscribe();
      flushQueuedSnapshot();
    };
  }, [flushQueuedSnapshot, schedulePersist]);

  const statusLabel = useMemo(() => {
    if (!isHydrated) {
      return texts.loadingWorkspace;
    }

    if (loadError) {
      return texts.loadedFallbackDefaults;
    }

    return texts.workspaceRestored;
  }, [isHydrated, loadError, texts]);

  useEffect(() => {
    persistLanguage(language);
  }, [language]);

  const handleActiveRowIdsChange = useCallback((nextRowIds: string[]) => {
    setActiveRowIds((current) => (sameStringArray(current, nextRowIds) ? current : nextRowIds));
  }, []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">{texts.eyebrow}</p>
          <h1>{texts.workspaceTitle}</h1>
          <p>{statusLabel}</p>
          {loadError ? <p className="error-inline">{loadError}</p> : null}
        </div>
        <div className="header-actions">
          <button type="button" onClick={addRowBelowFocused}>
            {texts.newRow}
          </button>
          <button type="button" onClick={duplicateFocusedTerminal}>
            {texts.duplicateTerminal}
          </button>
          <button type="button" onClick={toggleHelp}>
            {texts.help}
          </button>
          <button
            type="button"
            onClick={() => {
              setLanguage((previous) => (previous === "zh-CN" ? "en-US" : "zh-CN"));
            }}
          >
            {texts.languageSwitch}
          </button>
        </div>
      </header>

      <WorkspaceCanvas texts={texts} onActiveRowIdsChange={handleActiveRowIdsChange} />
      <HelpOverlay open={isHelpOpen} onClose={closeHelp} texts={texts} />
    </main>
  );
}

export default App;
