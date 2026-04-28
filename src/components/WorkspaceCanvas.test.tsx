import { fireEvent, render } from "@testing-library/react";

import { WorkspaceCanvas } from "./WorkspaceCanvas";
import { getTexts } from "../i18n";
import { workspaceStore } from "../store/workspaceStore";
import type { AppState, Cell, Row } from "../types/workspace";

vi.mock("./RowView", () => ({
  RowView: ({ row }: { row: Row }) => <div data-testid={`row-${row.id}`}>{row.title}</div>,
}));

const terminalCell = (id: string, cwd = "C:/repo"): Cell => ({
  id,
  type: "terminal",
  cwd,
  shellKind: "pwsh",
  status: "running",
});

const createState = (rows: Row[], focusedCellId: string, nextRowIndex = rows.length + 1): AppState => ({
  rows,
  focusedCellId,
  nextRowIndex,
  fontSize: 14,
});

describe("WorkspaceCanvas shortcuts", () => {
  const texts = getTexts("en-US");
  const onActiveRowIdsChange = vi.fn();

  beforeEach(() => {
    workspaceStore.getState().replaceState(
      createState(
        [
          { id: "row-1", title: "Row 1", cells: [terminalCell("terminal-1")] },
        ],
        "terminal-1",
        2,
      ),
    );
    workspaceStore.getState().closeHelp();
    onActiveRowIdsChange.mockClear();
  });

  it("inserts a row below focused row with Ctrl+Shift+ArrowDown", () => {
    workspaceStore.getState().replaceState(
      createState(
        [
          { id: "row-1", title: "Row 1", cells: [terminalCell("terminal-1")] },
          { id: "row-2", title: "Row 2", cells: [terminalCell("terminal-2")] },
        ],
        "terminal-1",
        3,
      ),
    );

    render(<WorkspaceCanvas texts={texts} onActiveRowIdsChange={onActiveRowIdsChange} />);
    fireEvent.keyDown(window, { key: "ArrowDown", ctrlKey: true, shiftKey: true });

    const state = workspaceStore.getState();
    expect(state.rows).toHaveLength(3);
    expect(state.rows[1].title).toBe("Row 3");
  });

  it("moves focus with Ctrl+Arrow", () => {
    workspaceStore.getState().replaceState(
      createState(
        [
          {
            id: "row-1",
            title: "Row 1",
            cells: [terminalCell("terminal-1"), terminalCell("terminal-1b")],
          },
          { id: "row-2", title: "Row 2", cells: [terminalCell("terminal-2")] },
        ],
        "terminal-1",
        3,
      ),
    );

    render(<WorkspaceCanvas texts={texts} onActiveRowIdsChange={onActiveRowIdsChange} />);

    fireEvent.keyDown(window, { key: "ArrowRight", ctrlKey: true });
    expect(workspaceStore.getState().focusedCellId).toBe("terminal-1b");

    fireEvent.keyDown(window, { key: "ArrowDown", ctrlKey: true });
    expect(workspaceStore.getState().focusedCellId).toBe("terminal-2");
  });

  it("duplicates terminal with Ctrl+D", () => {
    render(<WorkspaceCanvas texts={texts} onActiveRowIdsChange={onActiveRowIdsChange} />);

    fireEvent.keyDown(window, { key: "d", ctrlKey: true });

    const cells = workspaceStore.getState().rows[0].cells;
    expect(cells).toHaveLength(2);
    expect(cells[1]).toMatchObject({ type: "terminal", cwd: "C:/repo" });
  });

  it("closes focused cell with Ctrl+W", () => {
    workspaceStore.getState().replaceState(
      createState(
        [
          { id: "row-1", title: "Row 1", cells: [terminalCell("terminal-1")] },
          { id: "row-2", title: "Row 2", cells: [terminalCell("terminal-2")] },
        ],
        "terminal-2",
        3,
      ),
    );

    render(<WorkspaceCanvas texts={texts} onActiveRowIdsChange={onActiveRowIdsChange} />);

    fireEvent.keyDown(window, { key: "w", ctrlKey: true });

    const state = workspaceStore.getState();
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0].id).toBe("row-1");
  });

  it("toggles help with Ctrl+/", () => {
    render(<WorkspaceCanvas texts={texts} onActiveRowIdsChange={onActiveRowIdsChange} />);

    fireEvent.keyDown(window, { key: "/", ctrlKey: true });

    expect(workspaceStore.getState().isHelpOpen).toBe(true);
  });
});
