[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$packageSpec = 'dsh-native-reasoning-slider@0.1.6'
$chinese = [Globalization.CultureInfo]::CurrentUICulture.Name -like 'zh-*'

function Say([string]$ChineseText, [string]$EnglishText) {
    Write-Host $(if ($chinese) { $ChineseText } else { $EnglishText })
}

function New-DshInvocation([string]$Command, [string[]]$Prefix, [string]$Label) {
    [pscustomobject]@{ Command = $Command; Prefix = $Prefix; Label = $Label }
}

function Invoke-PluginAddWithReleaseAgeRecovery($Invocation, [string]$PackageSpec) {
    $arguments = @($Invocation.Prefix) + @('plugin', '--profile', 'web', 'add', $PackageSpec)
    $lines = [Collections.Generic.List[string]]::new()
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $Invocation.Command @arguments 2>&1 | ForEach-Object {
            $line = [string]$_
            $lines.Add($line)
            Write-Host $line
        }
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorAction
    }
    $releaseAgeBlocked = ($lines -join "`n") -match 'ERR_PNPM_(?:MINIMUM_RELEASE_AGE_VIOLATION|NO_MATURE_MATCHING_VERSION)'
    if ($exitCode -ne 0 -and $releaseAgeBlocked) {
        Say '现有锁文件包含仍在发布时间等待期内的版本；正在对此命令进行一次性确认重试…' 'The existing lockfile contains a version still inside the release-age hold; retrying this command once with a scoped confirmation...'
        $retryArguments = @($Invocation.Prefix) + @('plugin', '--profile', 'web', 'add', '--config.minimumReleaseAge=0', $PackageSpec)
        $previousErrorAction = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            & $Invocation.Command @retryArguments 2>&1 | ForEach-Object { Write-Host ([string]$_) }
            $exitCode = $LASTEXITCODE
        }
        finally {
            $ErrorActionPreference = $previousErrorAction
        }
    }
    return $exitCode
}

function Get-OfficialDshInvocation([string]$Node, [string]$Bin) {
    if (-not (Test-Path -LiteralPath $Node -PathType Leaf) -or -not (Test-Path -LiteralPath $Bin -PathType Leaf)) { return $null }
    $packageJson = Join-Path (Split-Path (Split-Path $Bin -Parent) -Parent) 'package.json'
    if (-not (Test-Path -LiteralPath $packageJson -PathType Leaf)) { return $null }
    try {
        $metadata = Get-Content -LiteralPath $packageJson -Raw | ConvertFrom-Json
        if ($metadata.name -ne '@deepseek-ai/dsh') { return $null }
        return New-DshInvocation (Resolve-Path -LiteralPath $Node).Path @((Resolve-Path -LiteralPath $Bin).Path) "DSH $($metadata.version)"
    }
    catch { return $null }
}

function Get-DshFromProductRoot([string]$Root) {
    if (-not $Root) { return $null }
    $official = Get-OfficialDshInvocation (Join-Path $Root 'runtime\node\node.exe') (Join-Path $Root 'app\node_modules\@deepseek-ai\dsh\lib\bin.js')
    if (-not $official) { return $null }
    $launcher = Join-Path $Root 'dsh.exe'
    if (Test-Path -LiteralPath $launcher -PathType Leaf) {
        return New-DshInvocation (Resolve-Path -LiteralPath $launcher).Path @() "DSH-Portable ($($official.Label))"
    }
    return $official
}

function Find-DshFromCurrentDirectory {
    $directory = [IO.DirectoryInfo]::new((Get-Location).Path)
    while ($null -ne $directory) {
        $candidate = Get-DshFromProductRoot $directory.FullName
        if ($candidate) { return $candidate }
        $directory = $directory.Parent
    }
    return $null
}

function Find-RunningOfficialDsh {
    $processes = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue)
    foreach ($process in $processes) {
        $line = [string]$process.CommandLine
        if ($line -notmatch '(?i)(?:^|[\s\"])([^\"]*node_modules[\\/]@deepseek-ai[\\/]dsh[\\/]lib[\\/]bin\.js)(?:\"|\s|$)') { continue }
        $candidate = Get-OfficialDshInvocation ([string]$process.ExecutablePath) $Matches[1].Trim('"')
        if ($candidate) { return $candidate }
    }
    return $null
}

function Find-CommonDsh {
    if (-not $env:USERPROFILE) { return $null }
    $found = @()
    foreach ($containerName in @('Downloads', 'Desktop', 'Documents')) {
        $container = Join-Path $env:USERPROFILE $containerName
        foreach ($root in @((Join-Path $container 'DSH-Portable'), $container)) {
            $candidate = Get-DshFromProductRoot $root
            if ($candidate) { $found += $candidate }
        }
        if (-not (Test-Path -LiteralPath $container -PathType Container)) { continue }
        foreach ($child in Get-ChildItem -LiteralPath $container -Directory -ErrorAction SilentlyContinue) {
            foreach ($root in @($child.FullName, (Join-Path $child.FullName 'DSH-Portable'))) {
                $candidate = Get-DshFromProductRoot $root
                if ($candidate) { $found += $candidate }
            }
        }
    }
    $unique = @($found | Group-Object -Property Command | ForEach-Object { $_.Group[0] })
    if ($unique.Count -eq 1) { return $unique[0] }
    if ($unique.Count -gt 1) {
        throw 'Multiple DSH installations were found. Start the one you want to update, then rerun this command.'
    }
    return $null
}

$dshCommand = Get-Command dsh -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
$invocation = if ($dshCommand) {
    New-DshInvocation $dshCommand.Source @() 'DSH on PATH'
} else {
    Find-DshFromCurrentDirectory
}
if (-not $invocation) { $invocation = Find-RunningOfficialDsh }
if (-not $invocation) { $invocation = Find-CommonDsh }
if (-not $invocation) {
    throw 'DSH was not found. Install or start DeepSeek Harness, or run this helper from the DSH product folder. The helper will not temporarily install the full DSH dependency tree.'
}

Say "目标：$($invocation.Label)" "Target: $($invocation.Label)"
Say '正在通过 DSH 官方插件命令安装…' 'Installing through the official DSH plugin command...'
$exitCode = Invoke-PluginAddWithReleaseAgeRecovery $invocation $packageSpec
if ($exitCode -ne 0) {
    throw "DSH plugin command failed with exit code $exitCode."
}
Say '安装完成。请保存工作并正常重启 DSH。' 'Installed. Save your work and restart DSH normally.'
