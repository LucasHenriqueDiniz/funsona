Set-Location 'E:\Repositories\funsona-v2\scripts\quiz-review'
Write-Output "[$(Get-Date -Format 'HH:mm:ss')] === FIX WEIGHTS ==="
npx tsx orchestrate.ts --fix-weights --verbose
Write-Output "[$(Get-Date -Format 'HH:mm:ss')] === FIX QUESTIONS ==="
npx tsx orchestrate.ts --fix-questions --verbose
Write-Output "[$(Get-Date -Format 'HH:mm:ss')] === DONE ==="
