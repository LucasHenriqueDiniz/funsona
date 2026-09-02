# Brings Forge (Stable Diffusion WebUI) up reliably:
# - ALWAYS uses the python from Forge's venv, never the system Python, which has
#   no torch installed and would kick off a ~2.4GB reinstall from scratch
# - only returns once the API actually answers (or fails explicitly)
# - does nothing when it is already running and healthy

param(
    [int]$TimeoutSeconds = 180
)

$ForgeDir   = "C:\Users\Lucas Diniz\stable-diffusion-webui-forge"
$VenvPython = "$ForgeDir\venv\Scripts\python.exe"
$SdUrl      = "http://127.0.0.1:7860"
$LogFile    = "E:\Repositories\funsona-v2\scripts\quiz-review\forge.log"

function Test-ForgeHealthy {
    try {
        Invoke-RestMethod -Uri "$SdUrl/sdapi/v1/progress" -TimeoutSec 5 | Out-Null
        return $true
    } catch { return $false }
}

if (Test-ForgeHealthy) {
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Forge is already running and healthy."
    exit 0
}

if (-not (Test-Path $VenvPython)) {
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] ❌ Forge venv not found at $VenvPython"
    exit 1
}

# Kill any orphaned Forge python process before starting again
Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "launch\.py" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Starting Forge with $VenvPython ..."

# IMPORTANT: redirect stdout/stderr straight to a FILE (through Start-Process),
# not to a .NET pipe that needs someone reading it in a loop. A pipe with no
# reader fills the OS buffer and wedges the Python process's own writes, which
# showed up as random "OSError: [Errno 22] Invalid argument" errors during image
# generation, hours after Forge came up.
if (Test-Path $LogFile) { Remove-Item $LogFile -Force }
if (Test-Path "$LogFile.err") { Remove-Item "$LogFile.err" -Force }

$proc = Start-Process -FilePath $VenvPython `
    -ArgumentList "launch.py", "--xformers", "--api", "--server-name", "127.0.0.1", "--port", "7860" `
    -WorkingDirectory $ForgeDir `
    -RedirectStandardOutput $LogFile `
    -RedirectStandardError "$LogFile.err" `
    -WindowStyle Hidden `
    -PassThru

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Forge PID: $($proc.Id). Waiting for the API (timeout ${TimeoutSeconds}s)..."

$waited = 0
while ($waited -lt $TimeoutSeconds) {
    Start-Sleep -Seconds 5
    $waited += 5
    if (Test-ForgeHealthy) {
        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] ✅ Forge ready after ${waited}s."
        exit 0
    }
    if ($proc.HasExited) {
        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] ❌ The Forge process died. See $LogFile"
        exit 1
    }
}

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] ❌ Timed out waiting for Forge to come up (${TimeoutSeconds}s). See $LogFile"
exit 1
