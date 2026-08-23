<div align="center">

# DSH Native Reasoning Slider

**A compact, model-aware reasoning control for DeepSeek Harness**

[![CI](https://github.com/WSL043/dsh-native-reasoning-slider/actions/workflows/ci.yml/badge.svg)](https://github.com/WSL043/dsh-native-reasoning-slider/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-native-reasoning-slider?logo=npm&label=npm)](https://www.npmjs.com/package/dsh-native-reasoning-slider)
[![npm downloads](https://img.shields.io/npm/dt/dsh-native-reasoning-slider?logo=npm&label=downloads)](https://www.npmjs.com/package/dsh-native-reasoning-slider)
[![MIT](https://img.shields.io/badge/license-MIT-111111.svg)](LICENSE)

[Install](#install) · [Modes](#three-modes-one-plugin) · [简体中文](README.zh-CN.md)

</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/WSL043/dsh-native-reasoning-slider/main/docs/assets/reasoning-slider-en.png" width="900" alt="Reasoning effort slider inside the DeepSeek Harness composer">
</p>

## Why this plugin

DSH models can advertise different reasoning-effort levels. This plugin turns
those exact levels into a compact slider in the composer without inventing
unsupported capabilities or changing provider routing.

- **Model-aware:** uses only the levels reported by the selected model.
- **Efficient:** dragging is local preview; DSH receives one selection on release.
- **Native:** follows DSH colors, spacing, menus, and model-directory contracts.
- **Accessible:** keyboard input works and reduced-motion disables animation.
- **Private:** no credentials, account access, telemetry, or plugin-owned network calls.

## Three modes, one plugin

Choose the presentation in **Settings -> General -> Reasoning control**:

| Mode | Behavior |
| --- | --- |
| **Official** | Restores DSH's unmodified model selector |
| **Native** | Adds a quiet, compact reasoning slider |
| **Energy** | Adds a brief Canvas effect while dragging and settling |

The plugin market remains the place to install, update, disable, or remove the
plugin. The setting changes presentation without installing duplicate plugins.

<p align="center">
  <img src="https://raw.githubusercontent.com/WSL043/dsh-native-reasoning-slider/main/docs/assets/mode-settings-en.png" width="820" alt="Official, Native, and Energy presentation modes in DSH Settings">
</p>

## Install

From an existing DSH installation:

```sh
dsh plugin --profile web add dsh-native-reasoning-slider
```

Then restart DSH. DSH-Portable users can run the same plugin command through
their bundled `dsh` executable. This plugin is tested against the latest DSH
release shown in the package metadata.

Update or uninstall:

```sh
dsh plugin --profile web update dsh-native-reasoning-slider
dsh plugin --profile web remove dsh-native-reasoning-slider
```

## Behavior and limits

- The selected effort applies through DSH's normal model-selection contract.
- Models with fewer than two advertised effort levels keep the standard model
  selector and show no artificial slider choices.
- Energy rendering runs only during interaction and a short settle period. It
  stops when idle and honors the operating system's reduced-motion preference.
- This plugin does not show DeepSeek balance or quota. Account-specific balance
  access belongs in a separate plugin with explicit permissions and failure UI.

This community project is not affiliated with or endorsed by DeepSeek.

[Report a bug](https://github.com/WSL043/dsh-native-reasoning-slider/issues) · [Security](SECURITY.md) · [MIT](LICENSE)
