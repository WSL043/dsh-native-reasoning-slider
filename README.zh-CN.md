<div align="center">

# DSH 原生 Effort 滑杆

**为 DeepSeek Harness 提供简洁、识别模型能力的推理强度控制**

[![CI](https://github.com/WSL043/dsh-native-reasoning-slider/actions/workflows/ci.yml/badge.svg)](https://github.com/WSL043/dsh-native-reasoning-slider/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-native-reasoning-slider?logo=npm&label=npm)](https://www.npmjs.com/package/dsh-native-reasoning-slider)
[![npm 总下载量](https://img.shields.io/npm/dt/dsh-native-reasoning-slider?logo=npm&label=%E6%80%BB%E4%B8%8B%E8%BD%BD%E9%87%8F)](https://www.npmjs.com/package/dsh-native-reasoning-slider)
[![MIT](https://img.shields.io/badge/license-MIT-111111.svg)](LICENSE)

[English](README.md) · [安装](#安装) · [三种模式](#一个插件三种模式)

</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/WSL043/dsh-native-reasoning-slider/main/docs/assets/reasoning-slider-zh.png" width="900" alt="DeepSeek Harness 输入框中的推理强度滑杆">
</p>

## 为什么做这个插件

DSH 中的不同模型会公布不同的推理强度档位。这个插件在输入框中只保留
“模型”和“强度”两个小胶囊，需要时才从强度胶囊展开紧凑滑杆；不虚构
模型能力，也不改变供应商路由。

- **识别模型能力：** 只显示当前模型实际提供的档位；
- **低开销：** 拖动时只做本地预览，松手后才向 DSH 提交一次；
- **原生风格：** 模型与 28px 强度胶囊分离，并沿用 DSH 的设计变量与接口；
- **个性配色：** 可为所有模型统一设置浅色/深色配色，也可按模型分别保存；
- **选择明确：** 支持键盘；原生模式保持静止，选择能量模式则明确开启动态；
- **隐私清晰：** 不读取凭据和账号，不收集遥测，也不自行发起网络请求。

## 一个插件，三种模式

在 **设置 -> 通用 -> 推理强度控制** 中选择：

| 模式 | 效果 |
| --- | --- |
| **官方** | 完全恢复 DSH 官方模型选择器 |
| **原生** | 使用安静的强度胶囊与紧凑弹出滑杆 |
| **能量** | 拖动与提交完成时显示短暂、独立实现的 WebGL 单元与辉光效果 |

插件市场负责安装、更新、停用和卸载；插件内部设置只负责切换外观，用户
无需安装多个功能重复的插件。

能量模式在浅色界面默认使用克制的蓝色，在深色界面默认使用紫色，两种
颜色均在 DSH 设置页中自定义。选择“全部模型”可共用一套配色；选择“按模型”
后，可在设置页选择模型并分别设置浅色和深色配色。输入框弹层只负责调节
推理强度。动效灵感来自 Claude，
但实现与模型接口均保持供应商中立。

<p align="center">
  <img src="https://raw.githubusercontent.com/WSL043/dsh-native-reasoning-slider/main/docs/assets/mode-settings-zh.png" width="820" alt="DSH 设置中的官方、原生与能量三种模式">
</p>

## 安装

PowerShell 一键安装助手（内部仍调用 DSH 官方插件命令）：

```powershell
irm 'https://github.com/WSL043/dsh-native-reasoning-slider/releases/latest/download/install.ps1' | iex
```

也可以直接运行官方 DSH 命令：

```sh
dsh plugin --profile web add dsh-native-reasoning-slider
```

随后自行重启 DSH。提供 `dsh` 的 DSH 发行形式均使用同一条官方命令。
本插件以软件包元数据中标明的最新 DSH 版本完成测试。

更新或卸载：

```sh
dsh plugin --profile web update dsh-native-reasoning-slider
dsh plugin --profile web remove dsh-native-reasoning-slider
```

## 行为边界

- 强度选择始终通过 DSH 官方模型选择接口提交；
- 模型没有公布至少两个强度档位时，不添加虚构选项；
- 能量效果只在紧凑弹层打开且档位不是 Off 时运行；关闭弹层即卸载，不需要动态时可选择原生模式；
- 本插件不读取 DeepSeek 余额或额度。账号余额属于另一个需要明确网络与
  凭据权限、独立失败处理的插件，不应和通用模型控件捆绑。

本项目为社区项目，与 DeepSeek 无隶属或背书关系。

[反馈问题](https://github.com/WSL043/dsh-native-reasoning-slider/issues) · [安全说明](SECURITY.md) · [MIT](LICENSE)
