[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$packageSpec = 'dsh-native-reasoning-slider@0.1.1'
$officialDsh = '@deepseek-ai/dsh@0.1.1-rc.2'
$chinese = [Globalization.CultureInfo]::CurrentUICulture.Name -like 'zh-*'

function Say([string]$ChineseText, [string]$EnglishText) {
    Write-Host $(if ($chinese) { $ChineseText } else { $EnglishText })
}

$dsh = Get-Command dsh -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if ($dsh) {
    $command = $dsh.Source
    $arguments = @('plugin', '--profile', 'web', 'add', $packageSpec)
}
else {
    $npx = Get-Command npx -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $npx) {
        throw 'DSH was not found. Install DeepSeek Harness first, then rerun this command.'
    }
    $command = $npx.Source
    $arguments = @('-y', $officialDsh, 'plugin', '--profile', 'web', 'add', $packageSpec)
}

Say '正在通过 DSH 官方插件命令安装…' 'Installing through the official DSH plugin command...'
& $command @arguments
if ($LASTEXITCODE -ne 0) {
    throw "DSH plugin command failed with exit code $LASTEXITCODE."
}
Say '安装完成。请保存工作并正常重启 DSH。' 'Installed. Save your work and restart DSH normally.'
