use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const DEFAULT_FONT_SIZE: u16 = 14;
pub const MIN_FONT_SIZE: u16 = 10;
pub const MAX_FONT_SIZE: u16 = 24;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    #[serde(default)]
    pub rows: Vec<Row>,
    #[serde(default)]
    pub next_row_index: u32,
    #[serde(default = "default_font_size")]
    pub font_size: u16,
    #[serde(default)]
    pub focused_cell_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Row {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub cells: Vec<Cell>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Cell {
    Terminal(TerminalCell),
    Notes(NotesCell),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TerminalCell {
    pub id: String,
    pub cwd: String,
    pub shell_kind: ShellKind,
    pub status: TerminalStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NotesCell {
    pub id: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ShellKind {
    Pwsh,
    Powershell,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TerminalStatus {
    Running,
    Exited,
    Error,
}

impl AppState {
    pub fn default_workspace() -> Self {
        let row = Row::new(1, vec![Cell::terminal("")]);
        let focused_cell_id = row.cells.first().map(|cell| cell.id().to_owned());

        Self {
            rows: vec![row],
            next_row_index: 2,
            font_size: DEFAULT_FONT_SIZE,
            focused_cell_id,
        }
    }

    pub fn normalized(mut self) -> Self {
        self.rows.retain(|row| !row.cells.is_empty());
        if self.rows.is_empty() {
            return Self::default_workspace();
        }

        if self.next_row_index == 0 {
            self.next_row_index = self.rows.len() as u32 + 1;
        }
        self.font_size = clamp_font_size(self.font_size);

        if self
            .focused_cell_id
            .as_ref()
            .and_then(|cell_id| self.find_cell(cell_id))
            .is_none()
        {
            self.focused_cell_id = self.first_cell_id().map(str::to_owned);
        }

        self
    }

    pub fn first_cell_id(&self) -> Option<&str> {
        self.rows.first()?.cells.first().map(Cell::id)
    }

    fn find_cell(&self, target_id: &str) -> Option<&Cell> {
        self.rows
            .iter()
            .flat_map(|row| row.cells.iter())
            .find(|cell| cell.id() == target_id)
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            rows: Vec::new(),
            next_row_index: 0,
            font_size: DEFAULT_FONT_SIZE,
            focused_cell_id: None,
        }
    }
}

impl Row {
    pub fn new(row_index: u32, cells: Vec<Cell>) -> Self {
        Self {
            id: generate_id("row"),
            title: format!("Row {row_index}"),
            cells,
        }
    }
}

impl Cell {
    pub fn terminal(cwd: impl Into<String>) -> Self {
        Self::Terminal(TerminalCell {
            id: generate_id("terminal"),
            cwd: cwd.into(),
            shell_kind: ShellKind::Pwsh,
            status: TerminalStatus::Running,
        })
    }

    pub fn notes(text: impl Into<String>) -> Self {
        Self::Notes(NotesCell {
            id: generate_id("notes"),
            text: text.into(),
        })
    }

    pub fn id(&self) -> &str {
        match self {
            Self::Terminal(cell) => &cell.id,
            Self::Notes(cell) => &cell.id,
        }
    }
}

pub fn clamp_font_size(font_size: u16) -> u16 {
    font_size.clamp(MIN_FONT_SIZE, MAX_FONT_SIZE)
}

fn default_font_size() -> u16 {
    DEFAULT_FONT_SIZE
}

fn generate_id(prefix: &str) -> String {
    format!("{prefix}-{}", Uuid::new_v4())
}
