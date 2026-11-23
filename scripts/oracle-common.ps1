# Shared helpers for Oracle's local production services (ADR-0010).
# Dot-source from the oracle-*.ps1 scripts. Windows PowerShell 5.1 compatible.

$ErrorActionPreference = 'Stop'
$script:Root = Split-Path -Parent $PSScriptRoot
$script:Logs = Join-Path $script:Root 'logs'
$script:Distro = 'Ubuntu-24.04'
$script:AgentDir = Join-Path $script:Root 'backend\agent'
$script:FrontendDir = Join-Path $script:Root 'frontend\app'
New-Item -ItemType Directory -Force -Path $script:Logs | Out-Null

function Get-EnvValue([string]$Name, [string]$Default) {
  $envFile = Join-Path $script:Root '.env'
  if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
      if ($line -match "^\s*$Name\s*=\s*(.*)$") {
        $value = $Matches[1].Trim().Trim('"').Trim("'")
        if ($value) { return $value }
      }
    }
  }
  return $Default
}

$script:ChatModel = Get-EnvValue 'OLLAMA_MODEL' 'qwen3.5:9b'
$script:EmbedModel = Get-EnvValue 'OLLAMA_EMBED_MODEL' 'nomic-embed-text'

function Write-OracleLog([string]$Message) {
  $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path (Join-Path $script:Logs 'supervisor.log') -Value $line
  Write-Host $line
}

function Get-ListenAddresses([int]$Port) {
  @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | ForEach-Object { $_.LocalAddress } | Sort-Object -Unique)
}

function Test-Port([int]$Port) { (Get-ListenAddresses $Port).Count -gt 0 }

function Get-PortOwners([int]$Port) {
  @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | ForEach-Object { $_.OwningProcess } | Sort-Object -Unique)
}

function Test-Http([string]$Url) {
  try { (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200 } catch { $false }
}

function Wait-Until([scriptblock]$Condition, [int]$Seconds) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (& $Condition) { return $true }
    Start-Sleep -Seconds 2
  }
  return (& $Condition)
}

function Get-NodePath {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) { throw 'node was not found on PATH' }
  return $node.Source
}

function Start-Hidden([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory, [string]$LogName) {
  $out = Join-Path $script:Logs "$LogName.log"
  $err = Join-Path $script:Logs "$LogName.err.log"
  Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory `
    -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err | Out-Null
}

# --- Components -------------------------------------------------------------

function Get-KeepAlive {
  @(Get-CimInstance Win32_Process -Filter "Name = 'wsl.exe'" | Where-Object { $_.CommandLine -like '*sleep infinity*' })
}

function Test-Postgres { Test-Port 5432 }

function Start-Postgres {
  if ((Get-KeepAlive).Count -eq 0) {
    # Holding a WSL process open keeps the distro (and systemd's PostgreSQL) running.
    # Redirect to files so the keep-alive never inherits (and holds open) the caller's output pipe.
    Start-Hidden 'wsl.exe' @('-d', $script:Distro, '--exec', 'sleep', 'infinity') $script:Root 'postgres-keepalive'
    Write-OracleLog "postgres: started WSL keep-alive ($script:Distro)"
  }
  if (-not (Wait-Until { Test-Postgres } 60)) {
    & wsl.exe -d $script:Distro -u root --exec systemctl start postgresql 2>$null
    Wait-Until { Test-Postgres } 30 | Out-Null
  }
}

function Test-Ollama {
  try {
    $names = @((Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5).models | ForEach-Object { $_.name })
    $hasChat = @($names | Where-Object { $_ -eq $script:ChatModel -or $_ -eq "$($script:ChatModel):latest" }).Count -gt 0
    $hasEmbed = @($names | Where-Object { $_ -eq $script:EmbedModel -or $_ -eq "$($script:EmbedModel):latest" }).Count -gt 0
    return ($hasChat -and $hasEmbed)
  } catch { return $false }
}

function Start-Ollama {
  $app = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama app.exe'
  if (-not (Test-Port 11434) -and (Test-Path $app)) {
    Start-Process -FilePath $app -WindowStyle Hidden | Out-Null
    Write-OracleLog 'ollama: started the Ollama app'
    Wait-Until { Test-Port 11434 } 30 | Out-Null
  }
  if (-not (Test-Ollama)) { Write-OracleLog "ollama: WARNING - models '$script:ChatModel' and/or '$script:EmbedModel' are not available (ollama pull them)" }
}

function Test-Agent { Test-Http 'http://127.0.0.1:4000/health' }

function Start-Agent {
  if (Test-Port 4000) { Write-OracleLog 'agent: port 4000 is taken but /health fails; leaving it alone'; return }
  Start-Hidden (Get-NodePath) @('--env-file-if-exists=../../.env', 'dist/server.js') $script:AgentDir 'agent'
  Write-OracleLog 'agent: started'
  Wait-Until { Test-Agent } 30 | Out-Null
}

function Test-Frontend { Test-Port 3000 }

function Start-Frontend {
  $next = Join-Path $script:FrontendDir 'node_modules\next\dist\bin\next'
  Start-Hidden (Get-NodePath) @("`"$next`"", 'start', '-H', '127.0.0.1', '-p', '3000') $script:FrontendDir 'frontend'
  Write-OracleLog 'frontend: started (next start on 127.0.0.1:3000)'
  Wait-Until { Test-Frontend } 30 | Out-Null
}

$script:Components = @(
  @{ Name = 'postgres'; Test = { Test-Postgres }; Start = { Start-Postgres } },
  @{ Name = 'ollama';   Test = { Test-Ollama };   Start = { Start-Ollama } },
  @{ Name = 'agent';    Test = { Test-Agent };    Start = { Start-Agent } },
  @{ Name = 'frontend'; Test = { Test-Frontend }; Start = { Start-Frontend } }
)

function Assert-Built {
  $missing = @()
  if (-not (Test-Path (Join-Path $script:AgentDir 'dist\server.js'))) { $missing += 'backend/agent/dist' }
  if (-not (Test-Path (Join-Path $script:FrontendDir '.next\BUILD_ID'))) { $missing += 'frontend/app/.next' }
  if ($missing.Count -gt 0) { throw "Missing build output ($($missing -join ', ')). Run 'pnpm build' first." }
}
