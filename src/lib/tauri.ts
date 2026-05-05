import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import { createDefaultAppState, type AppState, type TerminalStatus } from "../types/workspace";

type CreateTerminalSessionRequest = {
  cellId: string;
  cwd: string;
  cols: number;
  rows: number;
};

type WriteTerminalInputRequest = {
  cellId: string;
  data: string;
};

type ResizeTerminalRequest = {
  cellId: string;
  cols: number;
  rows: number;
};

type CellRequest = {
  cellId: string;
};

export type WorkspaceInfo = {
  id: string;
  name: string;
};

export type WorkspaceManifest = {
  workspaces: WorkspaceInfo[];
  currentWorkspaceId: string;
};

export type TerminalOutputEvent = {
  cellId: string;
  data: string;
};

export type TerminalStatusEvent = {
  cellId: string;
  status: TerminalStatus;
  error?: string;
};

export type TerminalCwdEvent = {
  cellId: string;
  cwd: string;
};

type CellEvent = {
  cellId: string;
};

type CellEventCallback<TEvent> = (payload: TEvent) => void;

type CellEventHub<TEvent extends CellEvent> = {
  handlersByCell: Map<string, Set<CellEventCallback<TEvent>>>;
  nativeUnlisten: UnlistenFn | null;
  listening: boolean;
};

const callCommand = async <TResponse>(
  command: string,
  payload?: Record<string, unknown>,
  fallback?: () => TResponse,
): Promise<TResponse> => {
  if (!isTauri()) {
    return fallback ? fallback() : (undefined as TResponse);
  }

  return invoke<TResponse>(command, payload);
};

const listenEvent = async <TPayload>(
  eventName: string,
  onEvent: (payload: TPayload) => void,
): Promise<UnlistenFn> => {
  if (!isTauri()) {
    return () => {
      // Browser preview mode has no native event channel.
    };
  }

  return listen<TPayload>(eventName, (event) => {
    onEvent(event.payload);
  });
};

const createCellEventHub = <TEvent extends CellEvent>(): CellEventHub<TEvent> => ({
  handlersByCell: new Map(),
  nativeUnlisten: null,
  listening: false,
});

const outputHub = createCellEventHub<TerminalOutputEvent>();
const statusHub = createCellEventHub<TerminalStatusEvent>();
const cwdHub = createCellEventHub<TerminalCwdEvent>();

const ensureNativeListener = async <TEvent extends CellEvent>(
  hub: CellEventHub<TEvent>,
  eventName: string,
) => {
  if (!isTauri() || hub.listening) {
    return;
  }

  hub.listening = true;
  hub.nativeUnlisten = await listenEvent<TEvent>(eventName, (payload) => {
    const handlers = hub.handlersByCell.get(payload.cellId);
    if (!handlers?.size) {
      return;
    }

    handlers.forEach((handler) => {
      handler(payload);
    });
  });
};

const releaseNativeListenerIfUnused = <TEvent extends CellEvent>(hub: CellEventHub<TEvent>) => {
  if (hub.handlersByCell.size > 0) {
    return;
  }

  if (hub.nativeUnlisten) {
    hub.nativeUnlisten();
  }
  hub.nativeUnlisten = null;
  hub.listening = false;
};

const subscribeCellEvent = async <TEvent extends CellEvent>(
  hub: CellEventHub<TEvent>,
  eventName: string,
  cellId: string,
  callback: CellEventCallback<TEvent>,
): Promise<UnlistenFn> => {
  if (!isTauri()) {
    return () => undefined;
  }

  const handlers = hub.handlersByCell.get(cellId) ?? new Set<CellEventCallback<TEvent>>();
  handlers.add(callback);
  hub.handlersByCell.set(cellId, handlers);

  await ensureNativeListener(hub, eventName);

  return () => {
    const currentHandlers = hub.handlersByCell.get(cellId);
    if (!currentHandlers) {
      return;
    }

    currentHandlers.delete(callback);
    if (currentHandlers.size === 0) {
      hub.handlersByCell.delete(cellId);
    }

    releaseNativeListenerIfUnused(hub);
  };
};

export const loadState = () =>
  callCommand<AppState>("load_state", undefined, () => createDefaultAppState());

export const saveState = (state: AppState) =>
  callCommand<void>("save_state", { state }, () => undefined);

export const createTerminalSession = (request: CreateTerminalSessionRequest) =>
  callCommand<void>("create_terminal_session", { request }, () => undefined);

export const writeTerminalInput = (request: WriteTerminalInputRequest) =>
  callCommand<void>("write_terminal_input", { request }, () => undefined);

export const resizeTerminal = (request: ResizeTerminalRequest) =>
  callCommand<void>("resize_terminal", { request }, () => undefined);

export const closeTerminalSession = (request: CellRequest) =>
  callCommand<void>("close_terminal_session", { request }, () => undefined);

export const restartTerminalSession = (request: CellRequest) =>
  callCommand<void>("restart_terminal_session", { request }, () => undefined);

export const listenTerminalOutput = (
  onEvent: (payload: TerminalOutputEvent) => void,
) => listenEvent<TerminalOutputEvent>("terminal://output", onEvent);

export const listenTerminalStatus = (
  onEvent: (payload: TerminalStatusEvent) => void,
) => listenEvent<TerminalStatusEvent>("terminal://status", onEvent);

export const listenTerminalCwd = (onEvent: (payload: TerminalCwdEvent) => void) =>
  listenEvent<TerminalCwdEvent>("terminal://cwd", onEvent);

export const subscribeTerminalOutput = (
  cellId: string,
  onEvent: (payload: TerminalOutputEvent) => void,
) => subscribeCellEvent(outputHub, "terminal://output", cellId, onEvent);

export const subscribeTerminalStatus = (
  cellId: string,
  onEvent: (payload: TerminalStatusEvent) => void,
) => subscribeCellEvent(statusHub, "terminal://status", cellId, onEvent);

export const subscribeTerminalCwd = (
  cellId: string,
  onEvent: (payload: TerminalCwdEvent) => void,
) => subscribeCellEvent(cwdHub, "terminal://cwd", cellId, onEvent);

export const setAlwaysOnTop = (enabled: boolean) =>
  callCommand<void>("set_always_on_top", { enabled }, () => undefined);

export const minimizeToTray = () =>
  callCommand<void>("minimize_to_tray", undefined, () => undefined);

export const setWindowTitle = (title: string) =>
  callCommand<void>("set_window_title", { title }, () => undefined);

export const listWorkspaces = () =>
  callCommand<WorkspaceManifest>("list_workspaces", undefined, () => ({
    workspaces: [{ id: "default", name: "Default" }],
    currentWorkspaceId: "default",
  }));

export const createWorkspace = (name: string) =>
  callCommand<WorkspaceManifest>("create_workspace", { name }, () => ({
    workspaces: [{ id: "default", name }],
    currentWorkspaceId: "default",
  }));

export const deleteWorkspace = (workspaceId: string) =>
  callCommand<WorkspaceManifest>("delete_workspace", { workspaceId }, () => ({
    workspaces: [{ id: "default", name: "Default" }],
    currentWorkspaceId: "default",
  }));

export const switchWorkspace = (workspaceId: string) =>
  callCommand<WorkspaceManifest>("switch_workspace", { workspaceId }, () => ({
    workspaces: [{ id: workspaceId, name: "Default" }],
    currentWorkspaceId: workspaceId,
  }));

export const loadWorkspaceState = (workspaceId: string) =>
  callCommand<AppState>("load_workspace_state", { workspaceId }, () => createDefaultAppState());

export const saveWorkspaceState = (workspaceId: string, state: AppState) =>
  callCommand<void>("save_workspace_state", { workspaceId, state }, () => undefined);
