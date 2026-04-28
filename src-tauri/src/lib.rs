#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(session::SessionManager::default())
        .invoke_handler(tauri::generate_handler![
            commands::state::load_state,
            commands::state::save_state,
            commands::terminal::create_terminal_session,
            commands::terminal::write_terminal_input,
            commands::terminal::resize_terminal,
            commands::terminal::close_terminal_session,
            commands::terminal::restart_terminal_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub mod commands;
pub mod model;
pub mod persistence;
pub mod session;
pub mod shell;

#[cfg(test)]
mod persistence_tests {
    use std::{fs, path::PathBuf};

    use uuid::Uuid;

    use crate::{
        model::{AppState, Cell},
        persistence::WorkspacePersistence,
    };

    fn test_state_path(test_name: &str) -> PathBuf {
        std::env::temp_dir()
            .join(format!("infinite-scroll-{test_name}-{}", Uuid::new_v4()))
            .join("state.json")
    }

    #[test]
    fn persistence_save_and_load_round_trip() {
        let state_path = test_state_path("round-trip");
        let persistence = WorkspacePersistence::new(state_path.clone());
        let mut state = AppState::default_workspace();
        let Some(Cell::Terminal(cell)) = state.rows[0].cells.get_mut(0) else {
            panic!("expected default terminal cell");
        };
        cell.cwd = String::from("C:\\repo");

        persistence.save(&state).expect("save should succeed");

        let loaded = persistence.load().expect("load should succeed");
        let Some(Cell::Terminal(cell)) = loaded.rows[0].cells.first() else {
            panic!("expected persisted terminal cell");
        };

        assert_eq!(cell.cwd, "C:\\repo");
        assert_eq!(loaded.focused_cell_id, state.focused_cell_id);
        assert!(state_path.exists());
    }

    #[test]
    fn persistence_backs_up_corrupted_state_file_and_ignores_it() {
        let state_path = test_state_path("corrupted");
        let persistence = WorkspacePersistence::new(state_path.clone());

        fs::create_dir_all(
            state_path
                .parent()
                .expect("temporary state path should have a parent"),
        )
        .expect("create temp dir");
        fs::write(&state_path, "{ definitely-not-json").expect("write corrupted state");

        let loaded = persistence.load().expect("load should recover from corruption");
        let backups = fs::read_dir(
            state_path
                .parent()
                .expect("temporary state path should have a parent"),
        )
        .expect("list backup files")
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.contains(".corrupted"))
        })
        .collect::<Vec<_>>();

        assert_eq!(loaded.rows.len(), 1);
        assert_eq!(loaded.rows[0].cells.len(), 1);
        assert!(!state_path.exists());
        assert_eq!(backups.len(), 1);
    }

    #[test]
    fn persistence_returns_default_workspace_for_empty_state_file() {
        let state_path = test_state_path("empty");
        let persistence = WorkspacePersistence::new(state_path.clone());

        fs::create_dir_all(
            state_path
                .parent()
                .expect("temporary state path should have a parent"),
        )
        .expect("create temp dir");
        fs::write(&state_path, "").expect("write empty state");

        let loaded = persistence.load().expect("load should fall back to default");

        assert_eq!(loaded.rows.len(), 1);
        assert_eq!(loaded.rows[0].title, "Row 1");
        assert_eq!(loaded.rows[0].cells.len(), 1);
        assert_eq!(loaded.focused_cell_id, Some(loaded.rows[0].cells[0].id().to_owned()));
    }
}
