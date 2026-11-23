<#
.SYNOPSIS
  Stop Oracle's backend, frontend and WSL keep-alive (and the supervisor, if running).
  Ollama and Tailscale are left running.
#>
param([switch]$KeepPostgres)
. "$PSScriptRoot\oracle-common.ps1"

# Stop the supervisor first so it does not restart what we stop.
Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
  Where-Object { $_.CommandLine -like '*oracle-up.ps1*-Watch*' -and $_.ProcessId -ne $PID } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-OracleLog "supervisor: stopped (pid $($_.ProcessId))" }

foreach ($entry in @(@{ Name = 'agent'; Port = 4000 }, @{ Name = 'frontend'; Port = 3000 })) {
  foreach ($owner in Get-PortOwners $entry.Port) {
    Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
    Write-OracleLog "$($entry.Name): stopped (pid $owner)"
  }
}

if (-not $KeepPostgres) {
  foreach ($process in Get-KeepAlive) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    Write-OracleLog "postgres: stopped WSL keep-alive (pid $($process.ProcessId))"
  }
}

& "$PSScriptRoot\oracle-status.ps1"
