import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import App from "./App";
import * as tauriApi from "./lib/tauri";
import { workspaceStore } from "./store/workspaceStore";
import { createDefaultAppState } from "./types/workspace";

vi.mock("./components/WorkspaceCanvas", () => ({
  WorkspaceCanvas: () => <div data-testid="workspace-canvas">workspace-canvas</div>,
}));

vi.mock("./lib/tauri", () => ({
  loadState: vi.fn(async () => createDefaultAppState()),
  saveState: vi.fn(async () => undefined),
  createTerminalSession: vi.fn(async () => undefined),
  writeTerminalInput: vi.fn(async () => undefined),
  resizeTerminal: vi.fn(async () => undefined),
  closeTerminalSession: vi.fn(async () => undefined),
  restartTerminalSession: vi.fn(async () => undefined),
  listenTerminalOutput: vi.fn(async () => () => undefined),
  listenTerminalStatus: vi.fn(async () => () => undefined),
  listenTerminalCwd: vi.fn(async () => () => undefined),
}));

describe("App", () => {
  const mockedLoadState = vi.mocked(tauriApi.loadState);
  const mockedSaveState = vi.mocked(tauriApi.saveState);
  const mockedCreateTerminalSession = vi.mocked(tauriApi.createTerminalSession);
  const mockedCloseTerminalSession = vi.mocked(tauriApi.closeTerminalSession);

  beforeEach(() => {
    window.localStorage.clear();
    (window as Window & { requestIdleCallback?: (callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void) => number }).requestIdleCallback =
      (callback) => {
        callback({ didTimeout: false, timeRemaining: () => 50 });
        return 1;
      };
    (window as Window & { cancelIdleCallback?: (handle: number) => void }).cancelIdleCallback = () => undefined;

    mockedLoadState.mockResolvedValue(createDefaultAppState());
    mockedSaveState.mockResolvedValue(undefined);
    mockedCreateTerminalSession.mockResolvedValue(undefined);
    mockedCloseTerminalSession.mockResolvedValue(undefined);
    vi.clearAllMocks();
  });

  it("renders workspace shell and default row", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /workspace|工作区/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("workspace-canvas")).toBeInTheDocument();
    });
  });

  it("autosaves after workspace state changes", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("workspace-canvas")).toBeInTheDocument();
    });

    workspaceStore.getState().setFontSize(17);

    await waitFor(() => {
      expect(mockedSaveState).toHaveBeenCalled();
    });
  });

  it("orchestrates terminal sessions when cells are removed", async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockedCreateTerminalSession).toHaveBeenCalled();
    });

    workspaceStore.getState().closeCell();

    await waitFor(() => {
      expect(mockedCloseTerminalSession).toHaveBeenCalled();
    });
  });

  it("toggles language between English and Chinese", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("workspace-canvas")).toBeInTheDocument();
    });

    const headingBefore = screen.getByRole("heading", { level: 1 }).textContent;
    const languageSwitch = screen.getByRole("button", { name: /english|中文/i });
    fireEvent.click(languageSwitch);
    const headingAfter = screen.getByRole("heading", { level: 1 }).textContent;

    expect(headingBefore).not.toBe(headingAfter);
  });
});
