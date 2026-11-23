<#
.SYNOPSIS
  Register (or remove) a user-level Scheduled Task that starts Oracle's supervisor at logon (ADR-0010).
  No admin rights needed. Run it yourself; it changes your Windows startup configuration.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\oracle-autostart.ps1 -Install
  powershell -ExecutionPolicy Bypass -File scripts\oracle-autostart.ps1 -Uninstall
#>
param([switch]$Install, [switch]$Uninstall)
$ErrorActionPreference = 'Stop'
$taskName = 'Oracle (supervisor)'
$script = Join-Path $PSScriptRoot 'oracle-up.ps1'

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed scheduled task '$taskName'."
  return
}
if (-not $Install) { Write-Host 'Use -Install or -Uninstall.'; return }

$user = "$env:USERDOMAIN\$env:USERNAME"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`" -Watch" `
  -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
  -Description 'Starts and supervises Oracle (Postgres keep-alive, backend, frontend). See docs/operations.md.' -Force | Out-Null
Write-Host "Registered '$taskName'. It runs at your next logon; to start now: Start-ScheduledTask -TaskName '$taskName'"
