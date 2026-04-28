import { fireEvent, render, screen } from "@testing-library/react";

import { TerminalCell } from "./TerminalCell";
import { getTexts } from "../i18n";
import { useTerminalSession } from "../hooks/useTerminalSession";
import type { TerminalCell as TerminalCellModel } from "../types/workspace";

vi.mock("../hooks/useTerminalSession", () => ({
  useTerminalSession: vi.fn(),
}));

const mockedUseTerminalSession = vi.mocked(useTerminalSession);

const createCell = (overrides: Partial<TerminalCellModel> = {}): TerminalCellModel => ({
  id: "terminal-1",
  type: "terminal",
  cwd: "C:/repo",
  shellKind: "pwsh",
  status: "running",
  ...overrides,
});

describe("TerminalCell", () => {
  const texts = getTexts("en-US");

  it("renders running terminal host", () => {
    mockedUseTerminalSession.mockReturnValue({
      hostRef: vi.fn(),
      status: "running",
      errorMessage: null,
      restart: vi.fn(async () => undefined),
    });

    render(
      <TerminalCell
        cell={createCell()}
        isFocused={true}
        fontSize={14}
        onFocus={vi.fn()}
        onStatusChange={vi.fn()}
        onCwdChange={vi.fn()}
        texts={texts}
      />,
    );

    expect(screen.getByLabelText("Terminal terminal-1")).toBeInTheDocument();
    expect(screen.queryByText("Terminal failed to start")).not.toBeInTheDocument();
  });

  it("renders error fallback and restarts session", () => {
    const restart = vi.fn(async () => undefined);
    mockedUseTerminalSession.mockReturnValue({
      hostRef: vi.fn(),
      status: "error",
      errorMessage: "shell missing",
      restart,
    });

    render(
      <TerminalCell
        cell={createCell()}
        isFocused={false}
        fontSize={14}
        onFocus={vi.fn()}
        onStatusChange={vi.fn()}
        onCwdChange={vi.fn()}
        texts={texts}
      />,
    );

    expect(screen.getByText("Terminal failed to start")).toBeInTheDocument();
    expect(screen.getByText("shell missing")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restart" }));
    expect(restart).toHaveBeenCalledTimes(1);
  });

  it("renders exited fallback", () => {
    mockedUseTerminalSession.mockReturnValue({
      hostRef: vi.fn(),
      status: "exited",
      errorMessage: null,
      restart: vi.fn(async () => undefined),
    });

    render(
      <TerminalCell
        cell={createCell()}
        isFocused={false}
        fontSize={14}
        onFocus={vi.fn()}
        onStatusChange={vi.fn()}
        onCwdChange={vi.fn()}
        texts={texts}
      />,
    );

    expect(screen.getByText("Terminal exited")).toBeInTheDocument();
  });
});
