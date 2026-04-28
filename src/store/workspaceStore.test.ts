import { createWorkspaceStore } from "./workspaceStore";
import { DEFAULT_FONT_SIZE, MAX_FONT_SIZE, MIN_FONT_SIZE } from "../types/workspace";

const createTerminal = (overrides: Partial<{
  id: string;
  cwd: string;
  shellKind: "pwsh" | "powershell";
  status: "running" | "exited" | "error";
}> = {}) => ({
  id: overrides.id ?? crypto.randomUUID(),
  type: "terminal" as const,
  cwd: overrides.cwd ?? "C:/workspace",
  shellKind: overrides.shellKind ?? "pwsh",
  status: overrides.status ?? "running",
});

const createNotes = (overrides: Partial<{ id: string; text: string }> = {}) => ({
  id: overrides.id ?? crypto.randomUUID(),
  type: "notes" as const,
  text: overrides.text ?? "",
});

const createRow = (
  title: string,
  cells: Array<ReturnType<typeof createTerminal> | ReturnType<typeof createNotes>>,
  id: string = crypto.randomUUID(),
) => ({
  id,
  title,
  cells,
});

describe("workspaceStore", () => {
  it("creates the first row and terminal by default", () => {
    const store = createWorkspaceStore();
    const state = store.getState();

    expect(state.rows).toHaveLength(1);
    expect(state.rows[0].title).toBe("Row 1");
    expect(state.rows[0].cells).toHaveLength(1);
    expect(state.rows[0].cells[0].type).toBe("terminal");
    expect(state.focusedCellId).toBe(state.rows[0].cells[0].id);
    expect(state.nextRowIndex).toBe(2);
    expect(state.fontSize).toBe(DEFAULT_FONT_SIZE);
  });

  it("adds a row below the focused row", () => {
    const firstRow = createRow("Row 1", [createTerminal({ id: "terminal-1" })], "row-1");
    const secondRow = createRow("Row 2", [createNotes({ id: "notes-1" })], "row-2");
    const store = createWorkspaceStore({
      rows: [firstRow, secondRow],
      focusedCellId: firstRow.cells[0].id,
      nextRowIndex: 3,
      fontSize: DEFAULT_FONT_SIZE,
    });

    store.getState().addRowBelowFocused();

    const state = store.getState();
    expect(state.rows.map((row) => row.id)).toEqual(["row-1", state.rows[1].id, "row-2"]);
    expect(state.rows[1].title).toBe("Row 3");
    expect(state.rows[1].cells).toHaveLength(1);
    expect(state.rows[1].cells[0].type).toBe("terminal");
    expect(state.focusedCellId).toBe(state.rows[1].cells[0].id);
  });

  it("duplicates the focused terminal and copies its cwd", () => {
    const original = createTerminal({ id: "terminal-1", cwd: "C:/repo" });
    const row = createRow("Row 1", [original], "row-1");
    const store = createWorkspaceStore({
      rows: [row],
      focusedCellId: original.id,
      nextRowIndex: 2,
      fontSize: DEFAULT_FONT_SIZE,
    });

    store.getState().duplicateFocusedTerminal();

    const state = store.getState();
    expect(state.rows[0].cells).toHaveLength(2);
    expect(state.rows[0].cells[1]).toMatchObject({
      type: "terminal",
      cwd: "C:/repo",
      shellKind: "pwsh",
      status: "running",
    });
    expect(state.rows[0].cells[1].id).not.toBe(original.id);
    expect(state.focusedCellId).toBe(state.rows[0].cells[1].id);
  });

  it("removes the row when its last cell is closed", () => {
    const firstRow = createRow("Row 1", [createTerminal({ id: "terminal-1" })], "row-1");
    const lastCell = createTerminal({ id: "terminal-2" });
    const secondRow = createRow("Row 2", [lastCell], "row-2");
    const store = createWorkspaceStore({
      rows: [firstRow, secondRow],
      focusedCellId: lastCell.id,
      nextRowIndex: 3,
      fontSize: DEFAULT_FONT_SIZE,
    });

    store.getState().closeCell(lastCell.id);

    const state = store.getState();
    expect(state.rows.map((row) => row.id)).toEqual(["row-1"]);
    expect(state.focusedCellId).toBe(firstRow.cells[0].id);
  });

  it("clamps font size updates to the supported range", () => {
    const store = createWorkspaceStore();

    store.getState().setFontSize(MIN_FONT_SIZE - 10);
    expect(store.getState().fontSize).toBe(MIN_FONT_SIZE);

    store.getState().adjustFontSize(MAX_FONT_SIZE);
    expect(store.getState().fontSize).toBe(MAX_FONT_SIZE);
  });

  it("moves focus with row and cell navigation helpers", () => {
    const row1 = createRow("Row 1", [createTerminal({ id: "terminal-1" }), createNotes({ id: "notes-1" })], "row-1");
    const row2 = createRow("Row 2", [createTerminal({ id: "terminal-2" })], "row-2");
    const store = createWorkspaceStore({
      rows: [row1, row2],
      focusedCellId: "terminal-1",
      nextRowIndex: 3,
      fontSize: DEFAULT_FONT_SIZE,
    });

    store.getState().focusRight();
    expect(store.getState().focusedCellId).toBe("notes-1");

    store.getState().focusDown();
    expect(store.getState().focusedCellId).toBe("terminal-2");

    store.getState().focusUp();
    expect(store.getState().focusedCellId).toBe("terminal-1");
  });

  it("updates notes content and toggles help overlay state", () => {
    const notes = createNotes({ id: "notes-1", text: "old" });
    const store = createWorkspaceStore({
      rows: [createRow("Row 1", [notes], "row-1")],
      focusedCellId: notes.id,
      nextRowIndex: 2,
      fontSize: DEFAULT_FONT_SIZE,
    });

    store.getState().updateNotesCell(notes.id, "new content");
    expect(store.getState().rows[0].cells[0]).toMatchObject({ type: "notes", text: "new content" });

    store.getState().toggleHelp();
    expect(store.getState().isHelpOpen).toBe(true);
    store.getState().closeHelp();
    expect(store.getState().isHelpOpen).toBe(false);
  });

  it("keeps untouched row references when updating a single notes cell", () => {
    const firstRow = createRow("Row 1", [createNotes({ id: "notes-1", text: "a" })], "row-1");
    const secondRow = createRow("Row 2", [createTerminal({ id: "terminal-2" })], "row-2");
    const store = createWorkspaceStore({
      rows: [firstRow, secondRow],
      focusedCellId: "notes-1",
      nextRowIndex: 3,
      fontSize: DEFAULT_FONT_SIZE,
    });

    const before = store.getState().rows;
    store.getState().updateNotesCell("notes-1", "b");
    const after = store.getState().rows;

    expect(after[0]).not.toBe(before[0]);
    expect(after[1]).toBe(before[1]);
  });
});
