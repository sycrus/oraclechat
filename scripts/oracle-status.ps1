<#
.SYNOPSIS
  Show the state of Oracle's local services and where they listen.
#>
. "$PSScriptRoot\oracle-common.ps1"

$supervisor = @(Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object { $_.CommandLine -like '*oracle-up.ps1*-Watch*' })
$rows = @(
  [pscustomobject]@{ Component = 'postgres';   Up = (Test-Postgres); Listen = ((Get-ListenAddresses 5432) -join ', '); Note = "keep-alive: $((Get-KeepAlive).Count)" },
  [pscustomobject]@{ Component = 'ollama';     Up = (Test-Ollama);   Listen = ((Get-ListenAddresses 11434) -join ', '); Note = "$script:ChatModel + $script:EmbedModel" },
  [pscustomobject]@{ Component = 'agent';      Up = (Test-Agent);    Listen = ((Get-ListenAddresses 4000) -join ', '); Note = 'http://127.0.0.1:4000/health' },
  [pscustomobject]@{ Component = 'frontend';   Up = (Test-Frontend); Listen = ((Get-ListenAddresses 3000) -join ', '); Note = 'http://127.0.0.1:3000' },
  [pscustomobject]@{ Component = 'supervisor'; Up = ($supervisor.Count -gt 0); Listen = ''; Note = 'oracle-up.ps1 -Watch' }
)
$rows | Format-Table -AutoSize | Out-String | Write-Host

$exposed = @(4000, 3000 | ForEach-Object { Get-ListenAddresses $_ } | Where-Object { $_ -ne '127.0.0.1' -and $_ -ne '::1' })
if ($exposed.Count -gt 0) { Write-Host "WARNING: web ports listening beyond loopback: $($exposed -join ', ')" }
