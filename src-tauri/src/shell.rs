use std::{path::PathBuf, process::Command};

use thiserror::Error;

use crate::model::ShellKind;

#[derive(Debug, Clone)]
pub struct ShellInfo {
    pub executable: PathBuf,
    pub kind: ShellKind,
}

#[derive(Debug, Error)]
pub enum ShellError {
    #[error("no supported shell found (expected pwsh or powershell.exe)")]
    NoSupportedShell,
}

pub fn resolve_shell_by_availability<F>(mut is_available: F) -> Result<ShellInfo, ShellError>
where
    F: FnMut(&str) -> bool,
{
    if is_available("pwsh") {
        return Ok(ShellInfo {
            executable: PathBuf::from("pwsh"),
            kind: ShellKind::Pwsh,
        });
    }

    if is_available("powershell.exe") {
        return Ok(ShellInfo {
            executable: PathBuf::from("powershell.exe"),
            kind: ShellKind::Powershell,
        });
    }

    Err(ShellError::NoSupportedShell)
}

pub fn detect_shell() -> Result<ShellInfo, ShellError> {
    resolve_shell_by_availability(is_shell_available)
}

fn is_shell_available(command: &str) -> bool {
    Command::new("where")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::resolve_shell_by_availability;

    #[test]
    fn prefers_pwsh_when_both_shells_exist() {
        let shell = resolve_shell_by_availability(|candidate| {
            candidate.eq_ignore_ascii_case("pwsh")
                || candidate.eq_ignore_ascii_case("powershell.exe")
        })
        .expect("pwsh should be preferred");

        assert_eq!(shell.executable.to_string_lossy(), "pwsh");
    }

    #[test]
    fn falls_back_to_powershell_when_pwsh_is_missing() {
        let shell = resolve_shell_by_availability(|candidate| {
            candidate.eq_ignore_ascii_case("powershell.exe")
        })
        .expect("powershell.exe should be selected");

        assert_eq!(shell.executable.to_string_lossy(), "powershell.exe");
    }

    #[test]
    fn returns_error_when_no_supported_shell_is_available() {
        let result = resolve_shell_by_availability(|_| false);
        assert!(result.is_err());
    }
}
