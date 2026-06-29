# Watchdog for orchestrate.ts - keeps the pipeline running unattended for hours.
#
# - ensures Chrome (CDP on port 9222, persistent profile) is open
# - finds the next pending batch (orchestrate.ts --next)
# - runs orchestrate.ts --start <next> --end 257
# - if the process exits (rate limit, crash, Chrome closed, etc), waits a bit
#   and tries again, relaunching Chrome if needed
# - once all 257 batches are applied, runs --refactor in a loop until the
#   refactor queue is empty
# - stops after $MaxHours (default 11h) so it does not run forever if stuck

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

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Watchdog started. Max duration: $MaxHours h (deadline $($deadline.ToString('HH:mm:ss')))."

while ((Get-Date) -lt $deadline) {
    $next = (npx tsx orchestrate.ts --next 2>$null | Select-Object -Last 1).ToString().Trim()

    if ($next -match '^\d+$' -and [int]$next -le 257) {
        Ensure-Chrome
        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] START batch $next"
        $job = Start-Job -ScriptBlock {
            param($dir, $n)
            Set-Location $dir
            npx tsx orchestrate.ts --start $n --end $n --verbose
        } -ArgumentList $ScriptDir, $next
        $done = Wait-Job $job -Timeout 1500  # 25min hard cap per batch
        if (-not $done) {
            Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Batch $next TIMED OUT (25min) - killing job"
            Stop-Job $job
            Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        }
        Receive-Job $job
        Remove-Job $job -Force
        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] END batch $next"
    } else {
        $pending = (npx tsx orchestrate.ts --refactor-pending 2>$null | Select-Object -Last 1).ToString().Trim()
        if ($pending -match '^\d+$' -and [int]$pending -gt 0) {
            Ensure-Chrome
            Write-Output "[$(Get-Date -Format 'HH:mm:ss')] START refactor, pending count $pending"
            $job = Start-Job -ScriptBlock {
                param($dir)
                Set-Location $dir
                npx tsx orchestrate.ts --refactor --verbose
            } -ArgumentList $ScriptDir
            $done = Wait-Job $job -Timeout 1500
            if (-not $done) {
                Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Refactor TIMED OUT (25min) - killing job"
                Stop-Job $job
                Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            }
            Receive-Job $job
            Remove-Job $job -Force
            Write-Output "[$(Get-Date -Format 'HH:mm:ss')] END refactor"
        } else {
            Write-Output "[$(Get-Date -Format 'HH:mm:ss')] ALL DONE - 257 batches applied, refactor queue empty."
            npx tsx orchestrate.ts --status
            break
        }
    }

    if ((Get-Date) -lt $deadline) {
        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Sleeping 90s before next iteration..."
        Start-Sleep -Seconds 90
    }
}

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Watchdog finished."
