<#
.SYNOPSIS
    Produces two release artifacts:
      1. release/memo-<version>-source.zip      — source code (git-tracked only)
      2. release/Memo-<version>-windows.zip    — Windows install bundle
                                                  (win-unpacked + install scripts)

.DESCRIPTION
    - Source zip: uses `git archive` so only committed files are included.
      Recipient can clone equivalent content, `npm install`, and hack.
    - Windows zip: requires `release/win-unpacked` (run `npm run pack` first).
      Recipient extracts, double-clicks install.cmd, Memo appears in
      Windows search.

.PARAMETER Version
    Override the version label. Defaults to package.json version.
#>
[CmdletBinding()]
param(
    [string] $Version
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $ScriptDir
$ReleaseDir = Join-Path $RepoRoot 'release'

if (-not $Version) {
    $pkg = Get-Content -Raw -LiteralPath (Join-Path $RepoRoot 'package.json') | ConvertFrom-Json
    $Version = $pkg.version
}

New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null

# --- Source zip -------------------------------------------------------------
$sourceZip = Join-Path $ReleaseDir "memo-$Version-source.zip"
Write-Host "[bundle] Source zip → $sourceZip"
if (Test-Path -LiteralPath $sourceZip) { Remove-Item -LiteralPath $sourceZip -Force }

Push-Location $RepoRoot
try {
    & git archive --format=zip --output=$sourceZip --prefix="memo-$Version/" HEAD
    if ($LASTEXITCODE -ne 0) { throw "git archive failed (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}

# --- Windows distribution zip ----------------------------------------------
$winUnpacked = Join-Path $RepoRoot 'release\win-unpacked'
if (-not (Test-Path -LiteralPath $winUnpacked -PathType Container)) {
    throw "release/win-unpacked not found. Run 'npm run pack' first."
}

$stagingRoot = Join-Path $ReleaseDir 'dist-staging'
$payloadDir  = Join-Path $stagingRoot "Memo-$Version"
if (Test-Path -LiteralPath $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $payloadDir | Out-Null

Write-Host "[bundle] Assembling Windows bundle in $payloadDir"

# Copy win-unpacked into Memo-<version>/win-unpacked
$destUnpacked = Join-Path $payloadDir 'win-unpacked'
& robocopy $winUnpacked $destUnpacked /MIR /NFL /NDL /NJH /NJS /NP /NS /NC /R:2 /W:2 | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE)" }

# Copy install scripts to the bundle root (so install.cmd is double-clickable)
foreach ($script in @('install.cmd', 'install.ps1', 'uninstall.ps1')) {
    $src = Join-Path $ScriptDir $script
    $dst = Join-Path $payloadDir $script
    Copy-Item -LiteralPath $src -Destination $dst -Force
}

# Drop version.txt next to install scripts so install.ps1 records the right version.
Set-Content -LiteralPath (Join-Path $payloadDir 'version.txt') -Value $Version -Encoding UTF8

# Short install instructions for end users.
$installTxt = @"
Memo $Version — Windows install bundle

Install:
  1. Double-click install.cmd. (No admin required.)
  2. When it finishes, press the Windows key and type "memo" to launch.

Uninstall:
  - Windows: Settings -> Apps -> Installed apps -> Memo -> Uninstall
  - Or run uninstall.ps1 directly.

Notes:
  - Per-user install (%LOCALAPPDATA%\Programs\Memo). No system files modified.
  - Notes are kept in %APPDATA%\Memo and survive uninstall.
  - Source: https://github.com/dwkim/memo  (optional — update to your repo URL)
"@
Set-Content -LiteralPath (Join-Path $payloadDir 'INSTALL.txt') -Value $installTxt -Encoding UTF8

$winZip = Join-Path $ReleaseDir "Memo-$Version-windows.zip"
Write-Host "[bundle] Compressing → $winZip"
if (Test-Path -LiteralPath $winZip) { Remove-Item -LiteralPath $winZip -Force }
# Compress the whole Memo-<version>/ folder so extraction creates a
# clean top-level directory instead of scattering files.
Compress-Archive -Path $payloadDir -DestinationPath $winZip -CompressionLevel Optimal

# Clean up staging tree.
Remove-Item -LiteralPath $stagingRoot -Recurse -Force

Write-Host ""
Write-Host "[bundle] Done."
Write-Host "  Source  : $sourceZip"
Write-Host "  Windows : $winZip"
