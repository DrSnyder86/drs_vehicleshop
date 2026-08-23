param(
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

$resourceRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$serverScript = Join-Path $resourceRoot 'preview/server.mjs'
$serverRoot = 'http://127.0.0.1:4173/preview/'

function Test-DrsVehicleShopPreview {
    try {
        $response = Invoke-WebRequest -Uri $serverRoot -UseBasicParsing -TimeoutSec 1
        return ($response.StatusCode -eq 200 -and $response.Content.Contains('<title>DRS Vehicle Shop UI Previewer</title>'))
    } catch {
        return $false
    }
}

function Open-DrsVehicleShopPreview {
    if (-not $NoBrowser) {
        Start-Process $serverRoot
    }
}

$node = Get-Command node -CommandType Application -ErrorAction SilentlyContinue
if (-not $node) {
    throw 'Node.js was not found in PATH. Install Node.js, then run this file again.'
}

if (-not (Test-Path -LiteralPath $serverScript -PathType Leaf)) {
    throw "Preview server is missing: $serverScript"
}

if (Test-DrsVehicleShopPreview) {
    Open-DrsVehicleShopPreview
    if ($NoBrowser) {
        Write-Host 'The preview server is already running.'
    } else {
        Write-Host 'The preview server was already running, so the existing preview was opened.'
    }
    Write-Host 'Run stop-preview.cmd when you want to shut it down.'
    exit 0
}

$server = $null
$ready = $false

try {
    $server = Start-Process -FilePath $node.Source -ArgumentList @('preview/server.mjs') -WorkingDirectory $resourceRoot -WindowStyle Hidden -PassThru

    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($server.HasExited) {
            throw "The preview server stopped with exit code $($server.ExitCode). Port 4173 may be used by another application."
        }

        if (Test-DrsVehicleShopPreview) {
            $ready = $true
            break
        }

        Start-Sleep -Milliseconds 250
    }

    if (-not $ready) {
        throw 'The preview server did not become ready in time.'
    }

    Open-DrsVehicleShopPreview
    if ($NoBrowser) {
        Write-Host "Started the DRS Vehicle Shop preview at $serverRoot"
    } else {
        Write-Host "Opened the DRS Vehicle Shop preview at $serverRoot"
    }
    Write-Host 'The server will remain available after this window closes.'
    Write-Host 'Run stop-preview.cmd when you want to shut it down.'
} catch {
    if ($server -and -not $server.HasExited) {
        Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    }

    throw
}
