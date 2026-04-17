<#
.SYNOPSIS
    Per-user installer for Memo.

.DESCRIPTION
    Copies the Memo unpacked build into %LOCALAPPDATA%\Programs\Memo,
    creates Start Menu + Desktop shortcuts, and registers an uninstall
    entry under HKCU so Windows lists Memo in Settings -> Apps and
    surfaces it in Windows search.

    No admin rights or Windows Developer Mode required.

.PARAMETER SourceDir
    Path to the directory containing Memo.exe (unpacked build).
    Defaults to <repo>\release\win-unpacked when run from the repo.

.PARAMETER Version
    Version string recorded in Apps & Features. Defaults to the
    version field in the repo's package.json, or reads version.txt
    next to the installer in a release bundle.

.PARAMETER SkipDesktopShortcut
    Do not create a desktop shortcut.

.PARAMETER Silent
    Do not print progress messages.
#>
[CmdletBinding()]
param(
    [string] $SourceDir,
    [string] $Version,
    [switch] $SkipDesktopShortcut,
    [switch] $Silent
)

$ErrorActionPreference = 'Stop'

function Write-Info {
    param([string] $Message)
    if (-not $Silent) { Write-Host "[install] $Message" }
}

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot   = Split-Path -Parent $ScriptDir

# --- Resolve source ---------------------------------------------------------
if (-not $SourceDir) {
    $probe = @(
        (Join-Path $RepoRoot 'release\win-unpacked'),
        (Join-Path $ScriptDir 'win-unpacked'),
        (Join-Path $ScriptDir '..\win-unpacked')
    )
    $found = @($probe | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Container) })
    if ($found.Count -eq 0) {
        throw "Could not find win-unpacked. Run 'npm run pack' first or pass -SourceDir."
    }
    $SourceDir = [string] $found[0]
}

$SourceDir = (Resolve-Path -LiteralPath $SourceDir).Path
$exeSource = Join-Path $SourceDir 'Memo.exe'
if (-not (Test-Path -LiteralPath $exeSource)) {
    throw "Memo.exe not found in $SourceDir"
}

# --- Resolve version --------------------------------------------------------
if (-not $Version) {
    $pkgJsonPath = Join-Path $RepoRoot 'package.json'
    $versionTxt  = Join-Path $ScriptDir 'version.txt'
    if (Test-Path -LiteralPath $pkgJsonPath) {
        $Version = (Get-Content -Raw -LiteralPath $pkgJsonPath | ConvertFrom-Json).version
    } elseif (Test-Path -LiteralPath $versionTxt) {
        $Version = (Get-Content -Raw -LiteralPath $versionTxt).Trim()
    } else {
        $Version = '0.0.0'
    }
}

$AppName          = 'Memo'
$Publisher        = 'dwkim'
$InstallRoot      = Join-Path $env:LOCALAPPDATA 'Programs'
$InstallDir       = Join-Path $InstallRoot $AppName
$RegistryKey      = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Memo'
$StartMenuDir     = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$StartMenuLnk     = Join-Path $StartMenuDir "$AppName.lnk"
$DesktopDir       = [Environment]::GetFolderPath('Desktop')
$DesktopLnk       = Join-Path $DesktopDir "$AppName.lnk"

Write-Info "Source   : $SourceDir"
Write-Info "Version  : $Version"
Write-Info "Target   : $InstallDir"

# --- Stop running instance --------------------------------------------------
$running = Get-Process -Name 'Memo' -ErrorAction SilentlyContinue
if ($running) {
    Write-Info "Stopping $(($running | Measure-Object).Count) running Memo process(es)..."
    $running | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
}

# --- Copy files via robocopy /MIR ------------------------------------------
New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
Write-Info "Mirroring files..."
$robocopy = & robocopy $SourceDir $InstallDir /MIR /NFL /NDL /NJH /NJS /NP /NS /NC /R:2 /W:2
$rc = $LASTEXITCODE
# robocopy exit 0..7 = success; 8+ = failure.
if ($rc -ge 8) {
    throw "robocopy failed (exit $rc)"
}

# --- Drop the uninstaller into the install dir ------------------------------
$uninstallerSource = Join-Path $ScriptDir 'uninstall.ps1'
$installedScripts  = Join-Path $InstallDir 'scripts'
$installedUninst   = Join-Path $installedScripts 'uninstall.ps1'
if (Test-Path -LiteralPath $uninstallerSource) {
    New-Item -ItemType Directory -Force -Path $installedScripts | Out-Null
    Copy-Item -LiteralPath $uninstallerSource -Destination $installedUninst -Force
    Write-Info "Copied uninstaller to $installedUninst"
} else {
    Write-Warning "uninstall.ps1 not found at $uninstallerSource; Windows uninstall button will fail."
}

# --- Record version for future uninstall/reinstall --------------------------
Set-Content -LiteralPath (Join-Path $InstallDir 'version.txt') -Value $Version -Encoding UTF8

# --- Create shortcuts -------------------------------------------------------
$exeInstalled = Join-Path $InstallDir 'Memo.exe'

function New-Shortcut {
    param([string] $Path, [string] $Target, [string] $Description)
    $parent = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path -Force }
    $shell = New-Object -ComObject WScript.Shell
    try {
        $lnk = $shell.CreateShortcut($Path)
        $lnk.TargetPath       = $Target
        $lnk.WorkingDirectory = Split-Path -Parent $Target
        $lnk.IconLocation     = "$Target,0"
        $lnk.Description      = $Description
        $lnk.Save()
    } finally {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null
    }
}

Write-Info "Creating Start Menu shortcut..."
New-Shortcut -Path $StartMenuLnk -Target $exeInstalled -Description 'Memo — sticky-note-style markdown memos'

if (-not $SkipDesktopShortcut) {
    Write-Info "Creating Desktop shortcut..."
    New-Shortcut -Path $DesktopLnk -Target $exeInstalled -Description 'Memo'
}

# --- Register for Apps & Features ------------------------------------------
Write-Info "Registering in Apps & Features..."
if (-not (Test-Path -LiteralPath $RegistryKey)) {
    New-Item -Path $RegistryKey -Force | Out-Null
}
$sizeKB = [int](((Get-ChildItem -Recurse -LiteralPath $InstallDir | Measure-Object -Property Length -Sum).Sum) / 1024)
$uninstallCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$installedUninst`""
$quietUninstallCmd = "$uninstallCmd -Silent"

New-ItemProperty -Path $RegistryKey -Name 'DisplayName'          -Value $AppName        -PropertyType String -Force | Out-Null
New-ItemProperty -Path $RegistryKey -Name 'DisplayVersion'       -Value $Version        -PropertyType String -Force | Out-Null
New-ItemProperty -Path $RegistryKey -Name 'Publisher'            -Value $Publisher      -PropertyType String -Force | Out-Null
New-ItemProperty -Path $RegistryKey -Name 'InstallLocation'      -Value $InstallDir     -PropertyType String -Force | Out-Null
New-ItemProperty -Path $RegistryKey -Name 'DisplayIcon'          -Value "$exeInstalled,0" -PropertyType String -Force | Out-Null
New-ItemProperty -Path $RegistryKey -Name 'UninstallString'      -Value $uninstallCmd   -PropertyType String -Force | Out-Null
New-ItemProperty -Path $RegistryKey -Name 'QuietUninstallString' -Value $quietUninstallCmd -PropertyType String -Force | Out-Null
New-ItemProperty -Path $RegistryKey -Name 'EstimatedSize'        -Value $sizeKB         -PropertyType DWord  -Force | Out-Null
New-ItemProperty -Path $RegistryKey -Name 'NoModify'             -Value 1               -PropertyType DWord  -Force | Out-Null
New-ItemProperty -Path $RegistryKey -Name 'NoRepair'             -Value 1               -PropertyType DWord  -Force | Out-Null
New-ItemProperty -Path $RegistryKey -Name 'InstallDate'          -Value (Get-Date -Format 'yyyyMMdd') -PropertyType String -Force | Out-Null

Write-Info "Done. Type 'memo' in Windows search to launch."
