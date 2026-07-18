[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$backupPath = Join-Path $env:ProgramData "Homeservicehelper\dns-backup.json"
if (-not (Test-Path -LiteralPath $backupPath)) {
    throw "DNS backup not found: $backupPath"
}

$backup = Get-Content -Raw -LiteralPath $backupPath | ConvertFrom-Json
if (@($backup.ServerAddresses).Count -eq 0) {
    Set-DnsClientServerAddress -InterfaceAlias $backup.InterfaceAlias -ResetServerAddresses
} else {
    Set-DnsClientServerAddress -InterfaceAlias $backup.InterfaceAlias -ServerAddresses @($backup.ServerAddresses)
}
Clear-DnsClientCache
Write-Host "DNS settings restored for $($backup.InterfaceAlias)." -ForegroundColor Green
