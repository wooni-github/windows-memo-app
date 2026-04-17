<#
.SYNOPSIS
    Per-user uninstaller for Memo.

.DESCRIPTION
    Removes the installed Memo files, Start Menu + Desktop shortcuts,
    and the HKCU Uninstall registry key. Leaves %APPDATA%\Memo
    (user notes + window state) intact by default.

.PARAMETER PurgeUserData
    Also delete %APPDATA%\Memo. Prompts for confirmation unless
    -Silent is also set.

.PARAMETER Silent
    Suppress prompts and progress messages.
#>
[CmdletBinding()]
param(
    [switch] $PurgeUserData,
    [switch] $Silent
)

$ErrorActionPreference = 'Stop'

function Write-Info {
    param([string] $Message)
    if (-not $Silent) { Write-Host "[uninstall] $Message" }
}

$AppName      = 'Memo'
$InstallDir   = Join-Path $env:LOCALAPPDATA ('Programs\' + $AppName)
$RegistryKey  = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Memo'
$StartMenuLnk = Join-Path $env:APPDATA ('Microsoft\Windows\Start Menu\Programs\' + $AppName + '.lnk')
$DesktopLnk   = Join-Path ([Environment]::GetFolderPath('Desktop')) ($AppName + '.lnk')
$UserDataDir  = Join-Path $env:APPDATA $AppName

# --- Stop any running instance ---------------------------------------------
$running = Get-Process -Name 'Memo' -ErrorAction SilentlyContinue
if ($running) {
    Write-Info "Stopping running Memo..."
    $running | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
}

# --- Remove install directory ----------------------------------------------
if (Test-Path -LiteralPath $InstallDir) {
    Write-Info "Removing $InstallDir"
    # Self-delete safety: if the uninstaller script itself is running
    # from inside InstallDir, spawn a detached helper to remove after exit.
    $selfPath = $MyInvocation.MyCommand.Path
    if ($selfPath -and $selfPath.StartsWith($InstallDir, [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Info "Uninstaller lives inside install dir; scheduling deferred removal."
        $deferred = @"
Start-Sleep -Seconds 2
Remove-Item -LiteralPath '$InstallDir' -Recurse -Force -ErrorAction SilentlyContinue
"@
        $encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($deferred))
        Start-Process -WindowStyle Hidden -FilePath 'powershell.exe' `
            -ArgumentList '-NoProfile','-WindowStyle','Hidden','-EncodedCommand', $encoded | Out-Null
    } else {
        Remove-Item -LiteralPath $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Info "Install dir not found: $InstallDir"
}

# --- Remove shortcuts -------------------------------------------------------
foreach ($lnk in @($StartMenuLnk, $DesktopLnk)) {
    if (Test-Path -LiteralPath $lnk) {
        Write-Info "Removing shortcut $lnk"
        Remove-Item -LiteralPath $lnk -Force -ErrorAction SilentlyContinue
    }
}

# --- Remove registry key ----------------------------------------------------
if (Test-Path -LiteralPath $RegistryKey) {
    Write-Info "Removing registry key $RegistryKey"
    Remove-Item -LiteralPath $RegistryKey -Recurse -Force -ErrorAction SilentlyContinue
}

# --- Optional: purge user data ---------------------------------------------
if ($PurgeUserData) {
    if (Test-Path -LiteralPath $UserDataDir) {
        $go = $Silent
        if (-not $go) {
            $answer = Read-Host "Delete all Memo notes in '$UserDataDir'? [y/N]"
            $go = ($answer -match '^(y|yes)$')
        }
        if ($go) {
            Write-Info "Removing $UserDataDir"
            Remove-Item -LiteralPath $UserDataDir -Recurse -Force -ErrorAction SilentlyContinue
        } else {
            Write-Info "Keeping user data."
        }
    }
} else {
    if (Test-Path -LiteralPath $UserDataDir) {
        Write-Info "User data kept at $UserDataDir (use -PurgeUserData to remove)."
    }
}

Write-Info "Done."
