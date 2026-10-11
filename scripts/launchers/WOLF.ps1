# Install a Wolf launcher into the Windows Start Menu.
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..\..")

$Candidates = @(
  (Join-Path $ProjectRoot "src-tauri\target\release\wolf.exe"),
  (Join-Path $ProjectRoot "src-tauri\target\debug\wolf.exe"),
  (Join-Path $ProjectRoot "src-tauri\target\release\Wolf.exe")
)

$Target = $null
foreach ($candidate in $Candidates) {
  if (Test-Path $candidate) { $Target = $candidate; break }
}

$IconPath = Join-Path $ProjectRoot "src-tauri\icons\icon.ico"
$StartMenu = [Environment]::GetFolderPath("Programs")
$ShortcutPath = Join-Path $StartMenu "Wolf.lnk"

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.WorkingDirectory = $ProjectRoot

if ($Target) {
  $Shortcut.TargetPath = $Target
} else {
  $Shortcut.TargetPath = "cmd.exe"
  $Shortcut.Arguments = "/c npm run tauri -- dev"
}

if (Test-Path $IconPath) {
  $Shortcut.IconLocation = $IconPath
}

$Shortcut.Save()

Write-Host "Wolf shortcut written to $ShortcutPath"
if (-not $Target) {
  Write-Host "No built binary found. The shortcut runs the dev build; run 'npm run tauri -- build' for a release binary."
}
