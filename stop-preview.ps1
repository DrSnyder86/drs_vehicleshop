$ErrorActionPreference = 'Stop'

$serverRoot = 'http://127.0.0.1:4173/preview/'

try {
    $response = Invoke-WebRequest -Uri $serverRoot -UseBasicParsing -TimeoutSec 2
} catch {
    Write-Host 'The DRS Vehicle Shop preview server is not running.'
    exit 0
}

if (-not $response.Content.Contains('<title>DRS Vehicle Shop UI Previewer</title>')) {
    throw 'Port 4173 belongs to another application. Nothing was stopped.'
}

$listenerPid = $null

foreach ($line in (netstat -ano -p tcp)) {
    if ($line -match '^\s*TCP\s+127\.0\.0\.1:4173\s+\S+\s+LISTENING\s+(\d+)\s*$') {
        $listenerPid = [int]$Matches[1]
        break
    }
}

if (-not $listenerPid) {
    throw 'The preview responded, but its listening process could not be identified. Nothing was stopped.'
}

$listener = Get-Process -Id $listenerPid -ErrorAction Stop
if ($listener.ProcessName -ne 'node') {
    throw "Port 4173 is served by $($listener.ProcessName), not Node.js. Nothing was stopped."
}

Stop-Process -Id $listenerPid -Force

for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 100

    try {
        Invoke-WebRequest -Uri $serverRoot -UseBasicParsing -TimeoutSec 1 | Out-Null
    } catch {
        Write-Host 'The DRS Vehicle Shop preview server has been stopped.'
        exit 0
    }
}

throw 'The preview process was stopped, but port 4173 is still responding.'
