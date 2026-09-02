# Dual watchdog: refactor + image generator
# Runs both in parallel, health-checking every 30min, and makes sure
# Forge (Stable Diffusion) is always up before the image generator runs.

param(
    [int]$MaxHours = 11
)

$ScriptDir = "E:\Repositories\funsona-v2\scripts\quiz-review"
$Chrome    = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$Profile   = "$ScriptDir\chrome-profile"
$ProjectUrl = "https://chatgpt.com/g/g-p-6a275148f0008191aab99102db13aadd-funsona-quiz-review"

Set-Location $ScriptDir
$deadline = (Get-Date).AddHours($MaxHours)

function Test-CDP {
    try {
        Invoke-WebRequest -Uri "http://localhost:9222/json/version" -UseBasicParsing -TimeoutSec 3 | Out-Null
        return $true
    } catch { return $false }
}

function Ensure-Chrome {
    if (-not (Test-CDP)) {
        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Chrome/CDP down - relaunching..."
        Start-Process $Chrome -ArgumentList "--remote-debugging-port=9222","--user-data-dir=`"$Profile`"","--no-first-run","--no-default-browser-check","$ProjectUrl"
        Start-Sleep -Seconds 6
    }
}

function Ensure-Forge {
    & "$ScriptDir\start-forge.ps1" | ForEach-Object { Write-Output $_ }
}

function Check-Process {
    param($Name, $PidFile)
    if (-not (Test-Path $PidFile)) { return $false }
    $procId = [int](Get-Content $PidFile -ErrorAction SilentlyContinue)
    return $null -ne (Get-Process -Id $procId -ErrorAction SilentlyContinue)
}

function Start-Component {
    param($Name, $Script, $Args, $LogFile, $PidFile)
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Starting $Name..."

    $proc = Start-Process powershell.exe `
        -ArgumentList "-NonInteractive", "-File", $Script, $Args `
        -WorkingDirectory $ScriptDir `
        -RedirectStandardOutput $LogFile `
        -RedirectStandardError "$LogFile.err" `
        -WindowStyle Hidden `
        -PassThru

    $proc.Id | Out-File $PidFile -Encoding utf8
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] $Name PID: $($proc.Id)"
}

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] === Dual Watchdog: Refactor + Images ==="
Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Max duration: $MaxHours h, deadline: $($deadline.ToString('HH:mm:ss'))"

# Components
$RefactorScript = "$ScriptDir\watchdog.ps1"
$ImageScript = "$ScriptDir\image-generator-watchdog.ps1"
$RefactorLog = "$ScriptDir\refactor-parallel.log"
$ImageLog = "$ScriptDir\image-generator-parallel.log"
$RefactorPid = "$ScriptDir\refactor-parallel.pid"
$ImagePid = "$ScriptDir\image-generator-parallel.pid"

# Start both
Ensure-Chrome
Ensure-Forge
Start-Component "Refactor" $RefactorScript "-MaxHours $MaxHours" $RefactorLog $RefactorPid
Start-Sleep -Seconds 3
Start-Component "Image Generator" $ImageScript "-MaxHours $MaxHours" $ImageLog $ImagePid

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Both started. Health-checking every 30min..."

# Health checks
$lastCheck = Get-Date
while ((Get-Date) -lt $deadline) {
    $elapsed = (Get-Date) - $lastCheck
    if ($elapsed.TotalSeconds -ge 1800) {
        Write-Output ""
        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] === HEALTH CHECK ==="

        $refOk = Check-Process "Refactor" $RefactorPid
        $imgOk = Check-Process "Image Generator" $ImagePid
        $forgeOk = $false
        try { Invoke-RestMethod -Uri "http://127.0.0.1:7860/sdapi/v1/progress" -TimeoutSec 5 | Out-Null; $forgeOk = $true } catch {}

        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Refactor:       $(if ($refOk) { 'OK' } else { 'DEAD' })"
        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Image Gen:      $(if ($imgOk) { 'OK' } else { 'DEAD' })"
        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Forge API:      $(if ($forgeOk) { 'OK' } else { 'DOWN' })"

        if (-not $forgeOk) {
            Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Restarting Forge..."
            Ensure-Forge
        }
        if (-not $refOk) {
            Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Restarting Refactor..."
            Ensure-Chrome
            Start-Component "Refactor" $RefactorScript "-MaxHours $MaxHours" $RefactorLog $RefactorPid
        }
        if (-not $imgOk) {
            Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Restarting Image Generator..."
            Start-Component "Image Generator" $ImageScript "-MaxHours $MaxHours" $ImageLog $ImagePid
        }

        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] === END HEALTH CHECK ==="
        Write-Output ""
        $lastCheck = Get-Date
    }

    Start-Sleep -Seconds 60
}

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Deadline reached. Wrapping up."
Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Dual watchdog complete."
