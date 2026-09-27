$ErrorActionPreference = 'SilentlyContinue'
$bingaListener = Get-NetTCPConnection -State Listen -LocalPort 5173 | Select-Object -First 1

if ($null -eq $bingaListener) {
    exit 0
}

try {
    $bingaHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:5173/api/health' -TimeoutSec 2
    if ($bingaHealth.ok -eq $true) {
        exit 2
    }
} catch {
    exit 1
}

exit 1
