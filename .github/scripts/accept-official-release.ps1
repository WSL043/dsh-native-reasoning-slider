[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string] $PackagePath,
    [Parameter(Mandatory = $true)][string] $DshVersion,
    [int] $StartupTimeoutSeconds = 90
)

$ErrorActionPreference = 'Stop'
$package = (Resolve-Path -LiteralPath $PackagePath).Path
$pnpm = (Get-Command pnpm -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$root = Join-Path ([IO.Path]::GetTempPath()) ('dsh-slider-official-' + [Guid]::NewGuid().ToString('N'))
$previousDshHome = $env:DSH_HOME
$env:DSH_HOME = Join-Path $root 'dsh-home'
New-Item -ItemType Directory -Path $root | Out-Null
$prefix = @('--config.minimum-release-age=0', 'dlx', "@deepseek-ai/dsh@$DshVersion")

function Invoke-Dsh([string[]] $Arguments) {
    & $pnpm @prefix @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Official DSH command failed with exit code $LASTEXITCODE." }
}

function Get-ComposedConfig {
    $output = & $pnpm @prefix --profile web --dump-config 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'Official DSH config composition failed.' }
    return $output
}

function Assert-InstalledOnce {
    $list = & $pnpm @prefix plugin --profile web list dsh-reasoning-slider --depth 0 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'Official DSH plugin list failed.' }
    $config = Get-ComposedConfig
    if ([regex]::Matches($list, 'dsh-reasoning-slider@').Count -ne 1) { throw 'Candidate is not installed exactly once.' }
    if ([regex]::Matches($config, 'id: wsl043-native-reasoning-slider').Count -ne 1) { throw 'Candidate bundle is not composed exactly once.' }
}

function Start-And-ProbeWeb {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = ([Net.IPEndPoint] $listener.LocalEndpoint).Port
    $listener.Stop()
    $stdout = Join-Path $root 'web.stdout.log'
    $stderr = Join-Path $root 'web.stderr.log'
    $arguments = @($prefix) + @('--profile', 'web', '--no-open', '--port', [string] $port)
    $process = Start-Process -FilePath $pnpm -ArgumentList $arguments -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    try {
        $deadline = [DateTime]::UtcNow.AddSeconds($StartupTimeoutSeconds)
        $response = $null
        $webSession = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
        while ([DateTime]::UtcNow -lt $deadline) {
            if ($process.HasExited) { throw "DSH web exited early. $(Get-Content -LiteralPath $stderr -Raw -ErrorAction SilentlyContinue)" }
            try {
                $startupLog = Get-Content -LiteralPath $stdout -Raw -ErrorAction SilentlyContinue
                $loggedUrl = [regex]::Match([string] $startupLog, 'dsh web:\s+(http://127\.0\.0\.1:' + $port + '/(?:\?token=[A-Za-z0-9_-]+)?)')
                $readinessUrl = if ($loggedUrl.Success) { $loggedUrl.Groups[1].Value } else { "http://127.0.0.1:$port/" }
                $response = Invoke-WebRequest -UseBasicParsing $readinessUrl -WebSession $webSession -TimeoutSec 2
                if ($response.StatusCode -eq 200) { break }
            } catch { Start-Sleep -Milliseconds 250 }
        }
        if (-not $response -or $response.Content -notmatch 'DeepSeek Harness') { throw 'Official DSH Web did not become ready.' }
    } finally {
        if (-not $process.HasExited) { & taskkill.exe /PID $process.Id /T /F 2>$null | Out-Null }
    }
}

try {
    Invoke-Dsh @('plugin', '--profile', 'web', 'add', $package, '--loglevel', 'error')
    Assert-InstalledOnce
    Start-And-ProbeWeb
    Invoke-Dsh @('plugin', '--profile', 'web', 'remove', 'dsh-reasoning-slider', '--loglevel', 'error')
    if ((Get-ComposedConfig) -match 'id: wsl043-native-reasoning-slider') { throw 'Candidate remains after removal.' }
    Invoke-Dsh @('plugin', '--profile', 'web', 'add', $package, '--loglevel', 'error')
    Assert-InstalledOnce
    Write-Host 'Official DSH slider acceptance passed.'
} finally {
    $env:DSH_HOME = $previousDshHome
    $temp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $resolved = [IO.Path]::GetFullPath($root)
    if ($resolved.StartsWith($temp + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $resolved) -like 'dsh-slider-official-*') {
        Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction SilentlyContinue
    }
}
