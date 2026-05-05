import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "./components/App.module.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { WorkspaceCanvas } from "./components/WorkspaceCanvas";

const HelpOverlay = lazy(() => import("./components/HelpOverlay").then((m) => ({ default: m.HelpOverlay })));
const WorkspaceSwitcher = lazy(() =>
  import("./components/WorkspaceSwitcher").then((m) => ({ default: m.WorkspaceSwitcher })),
);
import { detectInitialLanguage, getTexts, persistLanguage, type AppLanguage } from "./i18n";
import { loadState, saveState, loadWorkspaceState, setAlwaysOnTop } from "./lib/tauri";
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
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState("default");
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

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

  const handleWorkspaceSwitch = useCallback(
    async (workspaceId: string) => {
      setCurrentWorkspaceId(workspaceId);
      try {
        const state = await loadWorkspaceState(workspaceId);
        replaceState(state);
      } catch {
        replaceState({ rows: [], nextRowIndex: 0, fontSize: 14, focusedCellId: null });
      }
    },
    [replaceState],
  );

  const handleToggleAlwaysOnTop = useCallback(() => {
    const next = !isAlwaysOnTop;
    setIsAlwaysOnTop(next);
    void setAlwaysOnTop(next);
  }, [isAlwaysOnTop]);

  return (
    <ErrorBoundary>
      <main className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div>
              <p className={styles.eyebrow}>{texts.eyebrow}</p>
              <h1 className={styles.headerTitle}>{texts.workspaceTitle}</h1>
            </div>
            <span className={styles.headerStatus}>{statusLabel}</span>
            {loadError ? <span className={styles.errorInline}>{loadError}</span> : null}
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.iconBtn} onClick={addRowBelowFocused} title={texts.newRow}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" />
              </svg>
              <span>{texts.newRow}</span>
            </button>
            <button type="button" className={styles.iconBtn} onClick={duplicateFocusedTerminal} title={texts.duplicateTerminal}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="5" width="8" height="8" rx="1.5" />
                <path d="M3 11V3a1.5 1.5 0 0 1 1.5-1.5H11" />
              </svg>
              <span>{texts.duplicateTerminal}</span>
            </button>
            <button
              type="button"
              className={`${styles.iconBtn}${isAlwaysOnTop ? ` ${styles.activeBtn}` : ""}`}
              onClick={handleToggleAlwaysOnTop}
              title={texts.alwaysOnTop}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2l3 5H5l3-5z" />
                <line x1="8" y1="7" x2="8" y2="14" />
              </svg>
              <span>{texts.alwaysOnTop}</span>
            </button>
            <button type="button" className={styles.iconBtn} onClick={toggleHelp} title={texts.help}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="8" r="6" />
                <path d="M6 6.5a2 2 0 0 1 3.5 1.5c0 1-1.5 1.2-1.5 2.5" />
                <circle cx="8" cy="12.5" r="0.5" fill="currentColor" />
              </svg>
              <span>{texts.help}</span>
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => {
                setLanguage((previous) => (previous === "zh-CN" ? "en-US" : "zh-CN"));
              }}
              title={texts.languageSwitch}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="8" r="6" />
                <ellipse cx="8" cy="8" rx="3" ry="6" />
                <line x1="2" y1="6" x2="14" y2="6" />
                <line x1="2" y1="10" x2="14" y2="10" />
              </svg>
              <span>{texts.languageSwitch}</span>
            </button>
            <Suspense fallback={null}>
              <WorkspaceSwitcher
                currentWorkspaceId={currentWorkspaceId}
                onWorkspaceSwitch={(id) => void handleWorkspaceSwitch(id)}
              />
            </Suspense>
          </div>
        </header>

        {isHydrated ? (
          <WorkspaceCanvas texts={texts} onActiveRowIdsChange={handleActiveRowIdsChange} />
        ) : (
          <LoadingSkeleton />
        )}
        <Suspense fallback={null}>
          <HelpOverlay open={isHelpOpen} onClose={closeHelp} texts={texts} />
        </Suspense>
      </main>
    </ErrorBoundary>
  );
}

export default App;
