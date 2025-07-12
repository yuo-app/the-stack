$ProjectRoot = (Get-Location).Path
if ($ProjectRoot.EndsWith("scripts")) {
    $ProjectRoot = (Resolve-Path ..).Path
}

# $ExecutablePath = Join-Path $ProjectRoot "src-tauri\target\debug\app.exe"
$ExecutablePath = Join-Path $ProjectRoot "src-tauri\target\release\app.exe"

$ProtocolScheme = "the-stack"

$RegistryPath = "HKCU:\Software\Classes\$ProtocolScheme"

if (-not (Test-Path $ExecutablePath)) {
    Write-Error "Tauri executable not found at '$ExecutablePath'. Please run 'bun run tauri dev' at least once to build it."
    exit 1
}

Write-Host "Registering protocol '$ProtocolScheme' for executable at '$ExecutablePath'..."

if (-not (Test-Path $RegistryPath)) {
    New-Item -Path $RegistryPath -Force | Out-Null
}

Set-ItemProperty -Path $RegistryPath -Name "(Default)" -Value "URL:$ProtocolScheme Protocol" -Force | Out-Null
Set-ItemProperty -Path $RegistryPath -Name "URL Protocol" -Value "" -Force | Out-Null

$CommandPath = Join-Path $RegistryPath "shell\open\command"
if (-not (Test-Path $CommandPath)) {
    New-Item -Path $CommandPath -Force | Out-Null
}

$CommandValue = """$ExecutablePath"" ""%1"""
Set-ItemProperty -Path $CommandPath -Name "(Default)" -Value $CommandValue -Force | Out-Null

Write-Host ("Successfully registered '{0}://' protocol." -f $ProtocolScheme)
Write-Host ("You can now test it by running: start {0}://test" -f $ProtocolScheme)