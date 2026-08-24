[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$packageSpec = 'dsh-native-reasoning-slider@0.1.2'
$officialDsh = '@deepseek-ai/dsh@0.1.1-rc.2'
$chinese = [Globalization.CultureInfo]::CurrentUICulture.Name -like 'zh-*'

function Say([string]$ChineseText, [string]$EnglishText) {
    Write-Host $(if ($chinese) { $ChineseText } else { $EnglishText })
}

function Find-RunningOfficialDsh {
    $processes = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue)
    foreach ($process in $processes) {
        $line = [string]$process.CommandLine
        if ($line -notmatch '(?i)(?:^|[\s\"])([^\"]*node_modules[\\/]@deepseek-ai[\\/]dsh[\\/]lib[\\/]bin\.js)(?:\"|\s|$)') { continue }
        $bin = $Matches[1].Trim('"')
        $node = [string]$process.ExecutablePath
        $packageJson = Join-Path (Split-Path (Split-Path $bin -Parent) -Parent) 'package.json'
        if (-not (Test-Path -LiteralPath $node -PathType Leaf) -or -not (Test-Path -LiteralPath $bin -PathType Leaf) -or -not (Test-Path -LiteralPath $packageJson -PathType Leaf)) { continue }
        try {
            $metadata = Get-Content -LiteralPath $packageJson -Raw | ConvertFrom-Json
            if ($metadata.name -eq '@deepseek-ai/dsh') {
                return [pscustomobject]@{ Node = $node; Bin = $bin; Version = [string]$metadata.version }
            }
        }
        catch { continue }
    }
    return $null
}

$dsh = Get-Command dsh -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if ($dsh) {
    $command = $dsh.Source
    $arguments = @('plugin', '--profile', 'web', 'add', $packageSpec)
}
else {
    $runningDsh = Find-RunningOfficialDsh
    if ($runningDsh) {
        $command = $runningDsh.Node
        $arguments = @($runningDsh.Bin, 'plugin', '--profile', 'web', 'add', $packageSpec)
        Say "正在复用运行中的 DSH $($runningDsh.Version)…" "Reusing running DSH $($runningDsh.Version)..."
    }
    else {
        $npx = Get-Command npx -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $npx) {
            throw 'DSH was not found. Install DeepSeek Harness first, then rerun this command.'
        }
        Say '未发现可复用的 DSH；首次解析官方命令可能需要几分钟。' 'No reusable DSH was found; the first official command resolution may take a few minutes.'
        $command = $npx.Source
        $arguments = @('-y', '--prefer-offline', '--no-audit', '--no-fund', $officialDsh, 'plugin', '--profile', 'web', 'add', $packageSpec)
    }
}

Say '正在通过 DSH 官方插件命令安装…' 'Installing through the official DSH plugin command...'
& $command @arguments
if ($LASTEXITCODE -ne 0) {
    throw "DSH plugin command failed with exit code $LASTEXITCODE."
}
Say '安装完成。请保存工作并正常重启 DSH。' 'Installed. Save your work and restart DSH normally.'
