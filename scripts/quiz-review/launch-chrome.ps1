# Inicia o Chrome com remote debugging na porta 9222
# Necessário para o orchestrate.ts conectar via CDP

$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) {
    Write-Error "Chrome nao encontrado. Instale o Chrome ou ajuste o caminho neste script."
    exit 1
}

# Usa um perfil separado para nao conflitar com o Chrome normal
$debugProfile = "$env:TEMP\chrome-cdp-profile"

Write-Host "Iniciando Chrome com remote debugging na porta 9222..."
Write-Host "Perfil de debug: $debugProfile"
Write-Host ""
Write-Host "Faca login no ChatGPT (chatgpt.com) nessa janela do Chrome."
Write-Host "Depois rode: npx tsx orchestrate.ts"

Start-Process $chrome -ArgumentList `
    "--remote-debugging-port=9222",
    "--user-data-dir=`"$debugProfile`"",
    "--no-first-run",
    "--no-default-browser-check",
    "https://chatgpt.com/"
