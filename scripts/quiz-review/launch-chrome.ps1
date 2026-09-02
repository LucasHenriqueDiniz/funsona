# Starts Chrome with remote debugging on port 9222
# Required for orchestrate.ts to connect over CDP

$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) {
    Write-Error "Chrome not found. Install Chrome, or fix the path in this script."
    exit 1
}

# Uses a separate profile so it does not clash with the everyday Chrome
$debugProfile = "$env:TEMP\chrome-cdp-profile"

Write-Host "Starting Chrome with remote debugging on port 9222..."
Write-Host "Debug profile: $debugProfile"
Write-Host ""
Write-Host "Log in to ChatGPT (chatgpt.com) in this Chrome window."
Write-Host "Then run: npx tsx orchestrate.ts"

Start-Process $chrome -ArgumentList `
    "--remote-debugging-port=9222",
    "--user-data-dir=`"$debugProfile`"",
    "--no-first-run",
    "--no-default-browser-check",
    "https://chatgpt.com/"
