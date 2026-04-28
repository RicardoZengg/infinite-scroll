export type AppLanguage = "zh-CN" | "en-US";

export type AppTexts = {
  eyebrow: string;
  workspaceTitle: string;
  loadingWorkspace: string;
  loadedFallbackDefaults: string;
  workspaceRestored: string;
  newRow: string;
  duplicateTerminal: string;
  help: string;
  languageSwitch: string;
  addNote: string;
  closeFocused: string;
  terminal: string;
  notes: string;
  terminalStartFailed: string;
  terminalExited: string;
  restart: string;
  shortcutsTitle: string;
  closeHelpOverlay: string;
  shortcutRows: Array<{ key: string; description: string }>;
};

const zhCNTexts: AppTexts = {
  eyebrow: "Infinite Scroll / Windows",
  workspaceTitle: "工作区",
  loadingWorkspace: "正在加载工作区",
  loadedFallbackDefaults: "读取失败，已使用默认状态",
  workspaceRestored: "工作区已恢复",
  newRow: "新建行",
  duplicateTerminal: "复制终端",
  help: "帮助",
  languageSwitch: "English",
  addNote: "添加笔记",
  closeFocused: "关闭当前焦点",
  terminal: "终端",
  notes: "笔记",
  terminalStartFailed: "终端启动失败",
  terminalExited: "终端已退出",
  restart: "重启",
  shortcutsTitle: "快捷键",
  closeHelpOverlay: "关闭帮助",
  shortcutRows: [
    { key: "Ctrl+Shift+Down", description: "在焦点行下方新建行" },
    { key: "Ctrl+D", description: "复制当前终端 cell" },
    { key: "Ctrl+W", description: "关闭当前焦点 cell" },
    { key: "Ctrl+Arrow", description: "在 row/cell 间移动焦点" },
    { key: "Ctrl+/", description: "显示/关闭帮助" },
    { key: "Ctrl+= / Ctrl+-", description: "调整字体大小" },
  ],
};

const enUSTexts: AppTexts = {
  eyebrow: "Infinite Scroll / Windows",
  workspaceTitle: "Workspace",
  loadingWorkspace: "Loading workspace",
  loadedFallbackDefaults: "Loaded with fallback defaults",
  workspaceRestored: "Workspace restored",
  newRow: "New Row",
  duplicateTerminal: "Duplicate Terminal",
  help: "Help",
  languageSwitch: "中文",
  addNote: "Add note",
  closeFocused: "Close focused",
  terminal: "Terminal",
  notes: "Notes",
  terminalStartFailed: "Terminal failed to start",
  terminalExited: "Terminal exited",
  restart: "Restart",
  shortcutsTitle: "Keyboard Shortcuts",
  closeHelpOverlay: "Close",
  shortcutRows: [
    { key: "Ctrl+Shift+Down", description: "Add a row below focused row" },
    { key: "Ctrl+D", description: "Duplicate focused terminal cell" },
    { key: "Ctrl+W", description: "Close focused cell" },
    { key: "Ctrl+Arrow", description: "Move focus between rows and cells" },
    { key: "Ctrl+/", description: "Toggle shortcut help overlay" },
    { key: "Ctrl+= / Ctrl+-", description: "Adjust font size" },
  ],
};

export const getTexts = (language: AppLanguage): AppTexts =>
  language === "zh-CN" ? zhCNTexts : enUSTexts;

const STORAGE_KEY = "infinite-scroll.language";

export const detectInitialLanguage = (): AppLanguage => {
  if (typeof window === "undefined") {
    return "en-US";
  }

  const persisted = window.localStorage.getItem(STORAGE_KEY);
  if (persisted === "zh-CN" || persisted === "en-US") {
    return persisted;
  }

  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
};

export const persistLanguage = (language: AppLanguage): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, language);
};
