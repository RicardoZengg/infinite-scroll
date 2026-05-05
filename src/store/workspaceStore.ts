import { createStore } from "zustand/vanilla";

import {
  type AppState,
  type Cell,
  type Row,
  type TerminalStatus,
  clampFontSize,
  createNotesCell,
  createTerminalCell,
  createRow,
  findCellLocation,
  isTerminalCell,
  normalizeAppState,
} from "../types/workspace";

type WorkspaceActions = {
  addRowBelowFocused: () => void;
  duplicateFocusedTerminal: () => void;
  addNotesToFocusedRow: () => void;
  closeCell: (cellId?: string) => void;
  setFocusedCellId: (cellId: string | null) => void;
  focusLeft: () => void;
  focusRight: () => void;
  focusUp: () => void;
  focusDown: () => void;
  setFontSize: (fontSize: number) => void;
  adjustFontSize: (delta: number) => void;
  updateNotesCell: (cellId: string, text: string) => void;
  setTerminalCwd: (cellId: string, cwd: string) => void;
  setTerminalStatus: (cellId: string, status: TerminalStatus) => void;
  toggleHelp: () => void;
  closeHelp: () => void;
  replaceState: (state: AppState) => void;
  moveRow: (fromIndex: number, toIndex: number) => void;
  renameRow: (rowId: string, title: string) => void;
  setSearchQuery: (query: string) => void;
  toggleSearch: () => void;
  closeSearch: () => void;
};

export type WorkspaceStoreState = AppState &
  WorkspaceActions & {
    isHelpOpen: boolean;
    searchQuery: string;
    isSearchOpen: boolean;
  };

const resolveFocusedCellId = (
  rows: Row[],
  preferredRowIndex: number,
  preferredCellIndex: number,
): string | null => {
  const sameRow = rows[preferredRowIndex];
  if (sameRow) {
    return sameRow.cells[Math.min(preferredCellIndex, sameRow.cells.length - 1)]?.id ?? null;
  }

  const previousRow = rows[preferredRowIndex - 1];
  if (previousRow) {
    return previousRow.cells[previousRow.cells.length - 1]?.id ?? null;
  }

  return rows[0]?.cells[0]?.id ?? null;
};

const updateRows = (
  rows: Row[],
  rowIndex: number,
  nextCells: Cell[],
): Row[] => {
  if (nextCells.length === 0) {
    return rows.filter((_, index) => index !== rowIndex);
  }

  return rows.map((row, index) =>
    index === rowIndex
      ? {
          ...row,
          cells: nextCells,
        }
      : row,
  );
};

const updateCell = (
  rows: Row[],
  cellId: string,
  updater: (cell: Cell) => Cell,
): Row[] =>
  rows.map((row) => {
    const cellIndex = row.cells.findIndex((cell) => cell.id === cellId);
    if (cellIndex < 0) {
      return row;
    }

    const currentCell = row.cells[cellIndex];
    const nextCell = updater(currentCell);
    if (nextCell === currentCell) {
      return row;
    }

    const cells = [...row.cells];
    cells[cellIndex] = nextCell;
    return {
      ...row,
      cells,
    };
  });

const focusWithinRow = (
  rows: Row[],
  focusedCellId: string | null,
  delta: number,
): string | null => {
  const location = findCellLocation(rows, focusedCellId);
  if (!location) {
    return focusedCellId;
  }

  const nextIndex = Math.max(0, Math.min(location.cellIndex + delta, rows[location.rowIndex].cells.length - 1));
  return rows[location.rowIndex].cells[nextIndex]?.id ?? focusedCellId;
};

const focusAcrossRows = (
  rows: Row[],
  focusedCellId: string | null,
  delta: number,
): string | null => {
  const location = findCellLocation(rows, focusedCellId);
  if (!location) {
    return focusedCellId;
  }

  const nextRowIndex = Math.max(0, Math.min(location.rowIndex + delta, rows.length - 1));
  const nextRow = rows[nextRowIndex];
  if (!nextRow) {
    return focusedCellId;
  }

  const nextCellIndex = Math.min(location.cellIndex, nextRow.cells.length - 1);
  return nextRow.cells[nextCellIndex]?.id ?? focusedCellId;
};

export const createWorkspaceStore = (initialState?: Partial<AppState>) =>
  createStore<WorkspaceStoreState>()((set, get) => ({
    ...normalizeAppState(initialState),
    isHelpOpen: false,
    searchQuery: "",
    isSearchOpen: false,
    addRowBelowFocused: () => {
      set((state) => {
        const current = normalizeAppState(state);
        const focusedLocation = findCellLocation(current.rows, current.focusedCellId);
        const insertAt = focusedLocation ? focusedLocation.rowIndex + 1 : current.rows.length;
        const row = createRow(current.nextRowIndex);
        const rows = [...current.rows];
        rows.splice(insertAt, 0, row);

        return {
          rows,
          nextRowIndex: current.nextRowIndex + 1,
          focusedCellId: row.cells[0]?.id ?? null,
        };
      });
    },
    duplicateFocusedTerminal: () => {
      set((state) => {
        const focusedLocation = findCellLocation(state.rows, state.focusedCellId);
        if (!focusedLocation || !isTerminalCell(focusedLocation.cell)) {
          return {};
        }

        const duplicatedCell = createTerminalCell({
          cwd: focusedLocation.cell.cwd,
          shellKind: focusedLocation.cell.shellKind,
          status: "running",
        });
        const row = state.rows[focusedLocation.rowIndex];
        const cells = [...row.cells];
        cells.splice(focusedLocation.cellIndex + 1, 0, duplicatedCell);

        return {
          rows: updateRows(state.rows, focusedLocation.rowIndex, cells),
          focusedCellId: duplicatedCell.id,
        };
      });
    },
    addNotesToFocusedRow: () => {
      set((state) => {
        const location = findCellLocation(state.rows, state.focusedCellId);
        if (!location) {
          return {};
        }

        const row = state.rows[location.rowIndex];
        const notes = createNotesCell();
        const cells = [...row.cells, notes];
        return {
          rows: updateRows(state.rows, location.rowIndex, cells),
          focusedCellId: notes.id,
        };
      });
    },
    closeCell: (cellId) => {
      set((state) => {
        const targetId = cellId ?? state.focusedCellId;
        const focusedLocation = findCellLocation(state.rows, targetId);
        if (!focusedLocation) {
          return {};
        }

        const row = state.rows[focusedLocation.rowIndex];
        const cells = row.cells.filter((cell) => cell.id !== targetId);
        const rows = updateRows(state.rows, focusedLocation.rowIndex, cells);

        return {
          rows,
          focusedCellId: resolveFocusedCellId(
            rows,
            focusedLocation.rowIndex,
            focusedLocation.cellIndex,
          ),
        };
      });
    },
    setFocusedCellId: (cellId) => {
      set((state) => ({
        focusedCellId: findCellLocation(state.rows, cellId) ? cellId : state.focusedCellId,
      }));
    },
    focusLeft: () => {
      set((state) => ({
        focusedCellId: focusWithinRow(state.rows, state.focusedCellId, -1),
      }));
    },
    focusRight: () => {
      set((state) => ({
        focusedCellId: focusWithinRow(state.rows, state.focusedCellId, 1),
      }));
    },
    focusUp: () => {
      set((state) => ({
        focusedCellId: focusAcrossRows(state.rows, state.focusedCellId, -1),
      }));
    },
    focusDown: () => {
      set((state) => ({
        focusedCellId: focusAcrossRows(state.rows, state.focusedCellId, 1),
      }));
    },
    setFontSize: (fontSize) => {
      set(() => ({
        fontSize: clampFontSize(fontSize),
      }));
    },
    adjustFontSize: (delta) => {
      const { fontSize, setFontSize } = get();
      setFontSize(fontSize + delta);
    },
    updateNotesCell: (cellId, text) => {
      set((state) => ({
        rows: updateCell(state.rows, cellId, (cell) =>
          cell.type === "notes" && cell.text !== text
            ? {
                ...cell,
                text,
              }
            : cell,
        ),
      }));
    },
    setTerminalCwd: (cellId, cwd) => {
      set((state) => ({
        rows: updateCell(state.rows, cellId, (cell) =>
          isTerminalCell(cell) && cell.cwd !== cwd
            ? {
                ...cell,
                cwd,
              }
            : cell,
        ),
      }));
    },
    setTerminalStatus: (cellId, status) => {
      set((state) => ({
        rows: updateCell(state.rows, cellId, (cell) =>
          isTerminalCell(cell) && cell.status !== status
            ? {
                ...cell,
                status,
              }
            : cell,
        ),
      }));
    },
    toggleHelp: () => {
      set((state) => ({
        isHelpOpen: !state.isHelpOpen,
      }));
    },
    closeHelp: () => {
      set(() => ({
        isHelpOpen: false,
      }));
    },
    replaceState: (state) => {
      set((current) => ({
        ...normalizeAppState(state),
        isHelpOpen: current.isHelpOpen,
      }));
    },
    moveRow: (fromIndex, toIndex) => {
      set((state) => {
        const rows = [...state.rows];
        if (fromIndex < 0 || fromIndex >= rows.length || toIndex < 0 || toIndex >= rows.length || fromIndex === toIndex) {
          return {};
        }
        const [moved] = rows.splice(fromIndex, 1);
        rows.splice(toIndex, 0, moved);
        return { rows };
      });
    },
    renameRow: (rowId, title) => {
      set((state) => ({
        rows: state.rows.map((row) =>
          row.id === rowId ? { ...row, title } : row,
        ),
      }));
    },
    setSearchQuery: (query) => {
      set(() => ({ searchQuery: query }));
    },
    toggleSearch: () => {
      set((state) => ({
        isSearchOpen: !state.isSearchOpen,
        searchQuery: state.isSearchOpen ? "" : state.searchQuery,
      }));
    },
    closeSearch: () => {
      set(() => ({ isSearchOpen: false, searchQuery: "" }));
    },
  }));

export const workspaceStore = createWorkspaceStore();
