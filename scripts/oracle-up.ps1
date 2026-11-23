<#
.SYNOPSIS
  Start Oracle's local services (ADR-0010). With -Watch, keep running and restart anything that stops.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\oracle-up.ps1
  powershell -ExecutionPolicy Bypass -File scripts\oracle-up.ps1 -Watch
#>
param([switch]$Watch, [int]$IntervalSeconds = 30)
. "$PSScriptRoot\oracle-common.ps1"

Assert-Built

function Invoke-EnsureAll {
  # The WSL keep-alive must exist even when Postgres is already up (for example from an open terminal).
  if ((Get-KeepAlive).Count -eq 0) { Start-Postgres }
  foreach ($component in $script:Components) {
    try {
      if (-not (& $component.Test)) {
        Write-OracleLog "$($component.Name): not running, starting"
        & $component.Start
        if (-not (& $component.Test)) { Write-OracleLog "$($component.Name): still not ready" }
      }
    } catch {
      Write-OracleLog "$($component.Name): error - $($_.Exception.Message)"
    }
  }
}

Invoke-EnsureAll
& "$PSScriptRoot\oracle-status.ps1"

if ($Watch) {
  Write-OracleLog "supervisor: watching every $IntervalSeconds s"
  while ($true) {
    Start-Sleep -Seconds $IntervalSeconds
    Invoke-EnsureAll
  }
}
