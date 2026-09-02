# Image generator watchdog - works the image queue in the background
# Makes sure Forge is up before each round, with automatic retry/restart

param(
    [int]$MaxHours = 10
)

$ScriptDir = "E:\Repositories\funsona-v2\scripts\quiz-review"
Set-Location $ScriptDir
$deadline = (Get-Date).AddHours($MaxHours)

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Image Generator Watchdog started. Max duration: $MaxHours h"

while ((Get-Date) -lt $deadline) {
    & "$ScriptDir\start-forge.ps1" | ForEach-Object { Write-Output $_ }

    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] START image generation"

    $job = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        npx tsx generate-images-from-queue.ts
    } -ArgumentList $ScriptDir

    $done = Wait-Job $job -Timeout 900  # 15min por batch

    if (-not $done) {
        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Image job TIMED OUT (15min) - restarting"
        Stop-Job $job
        Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    }

    Receive-Job $job
    Remove-Job $job -Force

    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] END image generation"

    if ((Get-Date) -lt $deadline) {
        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Sleeping 60s..."
        Start-Sleep -Seconds 60
    }
}

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Image generator watchdog finished."
