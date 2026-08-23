<div align="center">

# DSH 原生推理强度滑杆

**为 DeepSeek Harness 提供简洁、识别模型能力的推理强度控制**

[English](README.md) · [安装](#安装) · [三种模式](#一个插件三种模式)

</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/WSL043/dsh-native-reasoning-slider/main/docs/assets/reasoning-slider-zh.png" width="900" alt="DeepSeek Harness 输入框中的推理强度滑杆">
</p>

## 为什么做这个插件

DSH 中的不同模型会公布不同的推理强度档位。这个插件把当前模型真实
提供的档位变成输入框里的紧凑滑杆，不虚构模型能力，也不改变供应商路由。

- **识别模型能力：** 只显示当前模型实际提供的档位；
- **低开销：** 拖动时只做本地预览，松手后才向 DSH 提交一次；
- **原生风格：** 沿用 DSH 的颜色、间距、菜单与模型目录接口；
- **无障碍：** 支持键盘，并遵循系统的“减少动态效果”设置；
- **隐私清晰：** 不读取凭据和账号，不收集遥测，也不自行发起网络请求。

## 一个插件，三种模式

在 **设置 -> 通用 -> 推理强度控制** 中选择：

| 模式 | 效果 |
| --- | --- |
| **官方** | 完全恢复 DSH 官方模型选择器 |
| **原生** | 使用安静、紧凑的推理强度滑杆 |
| **能量** | 拖动与提交完成时显示短暂 Canvas 能量效果 |

插件市场负责安装、更新、停用和卸载；插件内部设置只负责切换外观，用户
无需安装多个功能重复的插件。

<p align="center">
  <img src="https://raw.githubusercontent.com/WSL043/dsh-native-reasoning-slider/main/docs/assets/mode-settings-zh.png" width="820" alt="DSH 设置中的官方、原生与能量三种模式">
</p>

## 安装

已有 DSH 的用户运行：

```sh
dsh plugin --profile web add dsh-native-reasoning-slider
```

随后自行重启 DSH。DSH-Portable 用户可通过产品内附带的 `dsh` 可执行文件
运行相同命令。本插件以软件包元数据中标明的最新 DSH 版本完成测试。

更新或卸载：

```sh
dsh plugin --profile web update dsh-native-reasoning-slider
dsh plugin --profile web remove dsh-native-reasoning-slider
```

## 行为边界

- 强度选择始终通过 DSH 官方模型选择接口提交；
- 模型没有公布至少两个强度档位时，不添加虚构选项；
- 能量效果只在交互和短暂收尾期间运行，空闲时停止；
- 本插件不读取 DeepSeek 余额或额度。账号余额属于另一个需要明确网络与
  凭据权限、独立失败处理的插件，不应和通用模型控件捆绑。

本项目为社区项目，与 DeepSeek 无隶属或背书关系。

[反馈问题](https://github.com/WSL043/dsh-native-reasoning-slider/issues) · [安全说明](SECURITY.md) · [MIT](LICENSE)
