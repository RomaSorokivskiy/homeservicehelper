[CmdletBinding()]
param(
    [string]$ServerIp = "192.168.31.163",
    [string]$Domain = "home.arpa",
    [Parameter(Mandatory = $true)]
    [string]$CertificatePath,
    [string]$InterfaceAlias
)

$ErrorActionPreference = "Stop"
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this script as Administrator."
}
if (-not (Test-Path -LiteralPath $CertificatePath)) {
    throw "CA certificate not found: $CertificatePath"
}

if (-not $InterfaceAlias) {
    $InterfaceAlias = Get-NetIPConfiguration |
        Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address.IPAddress -like "192.168.31.*" } |
        Select-Object -First 1 -ExpandProperty InterfaceAlias
}
if (-not $InterfaceAlias) {
    throw "Could not detect the active home network adapter. Pass -InterfaceAlias explicitly."
}

$stateDirectory = Join-Path $env:ProgramData "Homeservicehelper"
New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
$backupPath = Join-Path $stateDirectory "dns-backup.json"
if (-not (Test-Path -LiteralPath $backupPath)) {
    $current = Get-DnsClientServerAddress -InterfaceAlias $InterfaceAlias -AddressFamily IPv4
    [pscustomobject]@{
        InterfaceAlias = $InterfaceAlias
        ServerAddresses = @($current.ServerAddresses)
    } | ConvertTo-Json | Set-Content -LiteralPath $backupPath -Encoding UTF8
}

Set-DnsClientServerAddress -InterfaceAlias $InterfaceAlias -ServerAddresses $ServerIp
$certificate = Import-Certificate -FilePath $CertificatePath -CertStoreLocation "Cert:\LocalMachine\Root"
Clear-DnsClientCache

$resolved = Resolve-DnsName "home.$Domain" -Server $ServerIp -Type A
if ($resolved.IPAddress -notcontains $ServerIp) {
    throw "Local DNS validation failed."
}
$response = Invoke-WebRequest -Uri "https://home.$Domain" -UseBasicParsing -TimeoutSec 20
if ($response.StatusCode -ne 200) {
    throw "Dashboard returned HTTP $($response.StatusCode)."
}

Write-Host "Home access configured successfully." -ForegroundColor Green
Write-Host "Adapter: $InterfaceAlias"
Write-Host "DNS: $ServerIp"
Write-Host "CA thumbprint: $($certificate.Thumbprint)"
Write-Host "Open: https://home.$Domain"
