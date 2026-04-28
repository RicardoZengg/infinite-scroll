export const DEFAULT_FONT_SIZE = 14;
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 24;

export type ShellKind = "pwsh" | "powershell";
export type TerminalStatus = "running" | "exited" | "error";

export type TerminalCell = {
  id: string;
  type: "terminal";
  cwd: string;
  shellKind: ShellKind;
  status: TerminalStatus;
};

export type NotesCell = {
  id: string;
  type: "notes";
  text: string;
};

export type Cell = TerminalCell | NotesCell;

export type Row = {
  id: string;
  title: string;
  cells: Cell[];
};

export type AppState = {
  rows: Row[];
  nextRowIndex: number;
  fontSize: number;
  focusedCellId: string | null;
};

export const isTerminalCell = (cell: Cell): cell is TerminalCell => cell.type === "terminal";

const createId = (prefix: string) => {
  const idFactory = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  const uniqueId = idFactory ? idFactory() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${uniqueId}`;
};

export const clampFontSize = (fontSize: number) =>
  Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(fontSize)));

export const createTerminalCell = (
  overrides: Partial<Omit<TerminalCell, "type">> = {},
): TerminalCell => ({
  id: overrides.id ?? createId("terminal"),
  type: "terminal",
  cwd: overrides.cwd ?? "",
  shellKind: overrides.shellKind ?? "pwsh",
  status: overrides.status ?? "running",
});

export const createNotesCell = (
  overrides: Partial<Omit<NotesCell, "type">> = {},
): NotesCell => ({
  id: overrides.id ?? createId("notes"),
  type: "notes",
  text: overrides.text ?? "",
});

export const createRow = (rowIndex: number, cells: Cell[] = [createTerminalCell()]): Row => ({
  id: createId("row"),
  title: `Row ${rowIndex}`,
  cells,
});

export const createDefaultAppState = (): AppState => {
  const row = createRow(1);

  return {
    rows: [row],
    nextRowIndex: 2,
    fontSize: DEFAULT_FONT_SIZE,
    focusedCellId: row.cells[0]?.id ?? null,
  };
};

type CellLocation = {
  rowIndex: number;
  cellIndex: number;
  cell: Cell;
};

export const findCellLocation = (
  rows: Row[],
  cellId: string | null,
): CellLocation | null => {
  if (!cellId) {
    return null;
  }

  for (const [rowIndex, row] of rows.entries()) {
    const cellIndex = row.cells.findIndex((cell) => cell.id === cellId);
    if (cellIndex >= 0) {
      return {
        rowIndex,
        cellIndex,
        cell: row.cells[cellIndex],
      };
    }
  }

  return null;
};

const cloneCell = (cell: Cell): Cell =>
  isTerminalCell(cell)
    ? { ...cell }
    : {
        ...cell,
      };

const cloneRows = (rows: Row[]): Row[] =>
  rows
    .map((row) => ({
      ...row,
      cells: row.cells.map(cloneCell),
    }))
    .filter((row) => row.cells.length > 0);

export const normalizeAppState = (state?: Partial<AppState>): AppState => {
  if (!state?.rows?.length) {
    return createDefaultAppState();
  }

  const rows = cloneRows(state.rows);
  if (rows.length === 0) {
    return createDefaultAppState();
  }

  const fallbackFocusedCellId = rows[0].cells[0]?.id ?? null;
  const focusedCellId = findCellLocation(rows, state.focusedCellId ?? null)
    ? state.focusedCellId ?? null
    : fallbackFocusedCellId;

  return {
    rows,
    nextRowIndex: Math.max(state.nextRowIndex ?? rows.length + 1, 1),
    fontSize: clampFontSize(state.fontSize ?? DEFAULT_FONT_SIZE),
    focusedCellId,
  };
};
