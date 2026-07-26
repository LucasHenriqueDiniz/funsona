# Sobe o Forge (Stable Diffusion WebUI) de forma confiável:
# - usa SEMPRE o python do venv do Forge (nunca o Python do sistema, que não tem
#   torch instalado e dispara reinstalação de ~2.4GB do zero)
# - só retorna quando a API realmente responde (ou falha explicitamente)
# - se já estiver rodando e saudável, não faz nada

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
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Forge já está rodando e saudável."
    exit 0
}

if (-not (Test-Path $VenvPython)) {
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] ❌ venv do Forge não encontrado em $VenvPython"
    exit 1
}

# Mata qualquer processo python órfão do Forge antes de subir de novo
Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "launch\.py" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Subindo Forge com $VenvPython ..."

# IMPORTANTE: redireciona stdout/stderr direto pra ARQUIVO (via Start-Process),
# nao para um pipe .NET que precisa de alguem lendo em loop. Um pipe sem leitor
# enche o buffer do SO e trava as escritas internas do processo Python, o que
# se manifestava como erros aleatorios "OSError: [Errno 22] Invalid argument"
# durante a geracao de imagens horas depois do Forge subir.
if (Test-Path $LogFile) { Remove-Item $LogFile -Force }
if (Test-Path "$LogFile.err") { Remove-Item "$LogFile.err" -Force }

$proc = Start-Process -FilePath $VenvPython `
    -ArgumentList "launch.py", "--xformers", "--api", "--server-name", "127.0.0.1", "--port", "7860" `
    -WorkingDirectory $ForgeDir `
    -RedirectStandardOutput $LogFile `
    -RedirectStandardError "$LogFile.err" `
    -WindowStyle Hidden `
    -PassThru

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Forge PID: $($proc.Id). Aguardando API (timeout ${TimeoutSeconds}s)..."

$waited = 0
while ($waited -lt $TimeoutSeconds) {
    Start-Sleep -Seconds 5
    $waited += 5
    if (Test-ForgeHealthy) {
        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] ✅ Forge pronto após ${waited}s."
        exit 0
    }
    if ($proc.HasExited) {
        Write-Output "[$(Get-Date -Format 'HH:mm:ss')] ❌ Processo do Forge morreu. Veja $LogFile"
        exit 1
    }
}

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] ❌ Timeout esperando Forge subir (${TimeoutSeconds}s). Veja $LogFile"
exit 1
