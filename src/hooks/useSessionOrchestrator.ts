import { useEffect, useRef } from "react";

import { closeTerminalSession, createTerminalSession } from "../lib/tauri";
import type { Row, TerminalCell } from "../types/workspace";

const DEFAULT_COLS = 120;
const DEFAULT_ROWS = 30;

const collectTerminalCells = (rows: Row[]): Map<string, TerminalCell> => {
  const terminals = new Map<string, TerminalCell>();

  rows.forEach((row) => {
    row.cells.forEach((cell) => {
      if (cell.type === "terminal") {
        terminals.set(cell.id, cell);
      }
    });
  });

  return terminals;
};

export const useSessionOrchestrator = (
  rows: Row[],
  activeRowIds: string[],
  focusedCellId: string | null,
  setTerminalStatus: (cellId: string, status: "running" | "exited" | "error") => void,
  enabled: boolean,
) => {
  const activeSessionsRef = useRef<Set<string>>(new Set());
  const pendingSessionsRef = useRef<string[]>([]);
  const terminalSnapshotRef = useRef<Map<string, TerminalCell>>(new Map());
  const creatingRef = useRef(false);

  const enqueueMissingSessions = (
    terminals: Map<string, TerminalCell>,
    activeSessions: Set<string>,
    focusedId: string | null,
  ) => {
    const pendingSet = new Set(pendingSessionsRef.current);
    const orderedIds = [...terminals.keys()].sort((left, right) => {
      if (left === focusedId) {
        return -1;
      }
      if (right === focusedId) {
        return 1;
      }
      return 0;
    });

    orderedIds.forEach((cellId) => {
      if (activeSessions.has(cellId) || pendingSet.has(cellId)) {
        return;
      }
      pendingSessionsRef.current.push(cellId);
      pendingSet.add(cellId);
    });
  };

  const processQueue = () => {
    if (creatingRef.current || !enabled) {
      return;
    }

    const activeSessions = activeSessionsRef.current;
    const nextCellId = pendingSessionsRef.current.shift();
    if (!nextCellId) {
      return;
    }

    const terminal = terminalSnapshotRef.current.get(nextCellId);
    if (!terminal || activeSessions.has(nextCellId)) {
      processQueue();
      return;
    }

    creatingRef.current = true;
    activeSessions.add(nextCellId);
    void createTerminalSession({
      cellId: nextCellId,
      cwd: terminal.cwd,
      cols: DEFAULT_COLS,
      rows: DEFAULT_ROWS,
    })
      .then(() => {
        setTerminalStatus(nextCellId, "running");
      })
      .catch(() => {
        activeSessions.delete(nextCellId);
        setTerminalStatus(nextCellId, "error");
      })
      .finally(() => {
        creatingRef.current = false;
        window.setTimeout(() => {
          processQueue();
        }, 35);
      });
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const terminals = collectTerminalCells(rows);
    terminalSnapshotRef.current = terminals;
    const activeSessions = activeSessionsRef.current;

    const activeRowSet = new Set(activeRowIds);
    const focusedRow = focusedCellId
      ? rows.find((row) => row.cells.some((cell) => cell.id === focusedCellId))
      : undefined;
    if (focusedRow) {
      activeRowSet.add(focusedRow.id);
    }

    const targetRows =
      activeRowSet.size > 0
        ? rows.filter((row) => activeRowSet.has(row.id))
        : focusedRow
          ? [focusedRow]
          : rows.slice(0, 2);
    const targetTerminals = collectTerminalCells(targetRows);

    pendingSessionsRef.current = pendingSessionsRef.current.filter(
      (pendingId) => targetTerminals.has(pendingId) && terminals.has(pendingId),
    );

    enqueueMissingSessions(targetTerminals, activeSessions, focusedCellId);
    processQueue();

    [...activeSessions].forEach((cellId) => {
      if (terminals.has(cellId)) {
        return;
      }

      activeSessions.delete(cellId);
      pendingSessionsRef.current = pendingSessionsRef.current.filter((pending) => pending !== cellId);
      void closeTerminalSession({ cellId });
    });
  }, [activeRowIds, enabled, focusedCellId, rows, setTerminalStatus]);

  useEffect(
    () => () => {
      const activeSessions = [...activeSessionsRef.current];
      activeSessionsRef.current.clear();
      pendingSessionsRef.current = [];
      activeSessions.forEach((cellId) => {
        void closeTerminalSession({ cellId });
      });
    },
    [],
  );
};
