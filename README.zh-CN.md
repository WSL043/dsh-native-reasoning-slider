<div align="center">

# DSH 推理滑杆

**为 DeepSeek Harness 提供简洁、识别模型能力的推理强度控制**

[![CI](https://github.com/WSL043/dsh-reasoning-slider/actions/workflows/ci.yml/badge.svg)](https://github.com/WSL043/dsh-reasoning-slider/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-reasoning-slider?logo=npm&label=npm)](https://www.npmjs.com/package/dsh-reasoning-slider)
[![npm 总下载量](https://img.shields.io/npm/dt/dsh-reasoning-slider?logo=npm&label=%E6%80%BB%E4%B8%8B%E8%BD%BD%E9%87%8F)](https://www.npmjs.com/package/dsh-reasoning-slider)
[![状态](https://img.shields.io/badge/%E7%8A%B6%E6%80%81-Beta-7c3aed.svg)](#beta-状态)
[![MIT](https://img.shields.io/badge/license-MIT-111111.svg)](LICENSE)

[交互体验](https://wsl043.github.io/dsh-reasoning-slider/) · [安装](#安装) · [三种模式](#一个插件三种模式) · [English](README.md)

</div>

<p align="center">
  <a href="https://wsl043.github.io/dsh-reasoning-slider/"><img src="https://raw.githubusercontent.com/WSL043/dsh-reasoning-slider/main/docs/assets/reasoning-slider-hero-dark-en.png" width="900" alt="暗色 DeepSeek Harness 输入区与局部放大的能量推理滑杆"></a>
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

## Beta 状态

模型能力约束和 DSH 接入已经过测试，视觉渲染器与配色交互仍在持续打磨。
Beta 更新会兼容已有偏好，先通过真实使用反馈稳定视觉接口，再转为正式版。

## 一个插件，三种模式

在 **设置 -> 推理滑块 · Beta** 中选择：

| 模式 | 效果 |
| --- | --- |
| **官方** | 完全恢复 DSH 官方模型选择器 |
| **原生** | 使用安静的强度胶囊与紧凑弹出滑杆 |
| **能量** | 拖动与提交完成时显示短暂、独立实现的 WebGL 单元与辉光效果 |

插件市场负责安装、更新、停用和卸载；插件内部设置只负责切换外观，用户
无需安装多个功能重复的插件。

能量模式在强度切换期间使用一套正式单元渲染器；Off 和中间档落档后恢复静态，
模型公布的最高档则持续燃烧。它保留像素火焰场与点火喷射感，但改用恒定 CSS 像素速度，因此轨道变长不会让动画在观感
上减速。浅色和深色界面分别提供成套预设，并允许继续精调“效果色”和“轨道
底色”；选择“全部模型”可共用两套配色，选择“按模型”后则分别保存。旧版
两色配置会保留原来的效果色并自动补齐推荐底色。动效灵感来自 Claude，但实现
与模型接口均保持供应商中立。

<p align="center">
  <a href="https://wsl043.github.io/dsh-reasoning-slider/"><img src="https://raw.githubusercontent.com/WSL043/dsh-reasoning-slider/main/docs/assets/reasoning-slider-energy-dark.gif" width="612" alt="从 Off 拖动到 Max 的高清推理滑杆动图"></a>
</p>

可在[交互体验页](https://wsl043.github.io/dsh-reasoning-slider/)直接操作同一套正式渲染器，体验拖动、键盘、浅色/深色界面和实时配色；页面不连接任何账号。

<p align="center">
  <img src="https://raw.githubusercontent.com/WSL043/dsh-reasoning-slider/main/docs/assets/mode-settings-zh.png" width="820" alt="DSH 设置中的官方、原生与能量三种模式">
</p>

## 安装

PowerShell 一键安装助手（内部仍调用 DSH 官方插件命令）：

```powershell
irm 'https://github.com/WSL043/dsh-reasoning-slider/releases/latest/download/install.ps1' | iex
```

也可以直接运行官方 DSH 命令：

```sh
dsh plugin --profile web add dsh-reasoning-slider
```

随后自行重启 DSH。提供 `dsh` 的 DSH 发行形式均使用同一条官方命令。
本插件以软件包元数据中标明的最新 DSH 版本完成测试。

更新或卸载：

```sh
dsh plugin --profile web update dsh-reasoning-slider
dsh plugin --profile web remove dsh-reasoning-slider
```

## 行为边界

- 强度选择始终通过 DSH 官方模型选择接口提交；
- 模型没有公布至少两个强度档位时，不添加虚构选项；
- 能量效果只在紧凑弹层打开时运行；切换强度时短暂出现，落在 Off 或中间档后恢复静态，最高档则持续运行。关闭弹层即卸载，不需要动态时可选择原生模式；
- 本插件不读取 DeepSeek 余额或额度。账号余额属于另一个需要明确网络与
  凭据权限、独立失败处理的插件，不应和通用模型控件捆绑。

本项目为社区项目，与 DeepSeek 无隶属或背书关系。

[反馈问题](https://github.com/WSL043/dsh-reasoning-slider/issues) · [安全说明](SECURITY.md) · [MIT](LICENSE)
