<div align="center">

# DSH Reasoning Slider

**A compact, model-aware effort control for DeepSeek Harness**

[![CI](https://github.com/WSL043/dsh-reasoning-slider/actions/workflows/ci.yml/badge.svg)](https://github.com/WSL043/dsh-reasoning-slider/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-reasoning-slider?logo=npm&label=npm)](https://www.npmjs.com/package/dsh-reasoning-slider)
[![total npm downloads](https://img.shields.io/npm/dt/dsh-reasoning-slider?logo=npm&label=total%20downloads)](https://www.npmjs.com/package/dsh-reasoning-slider)
[![status](https://img.shields.io/badge/status-Beta-7c3aed.svg)](#beta-status)
[![MIT](https://img.shields.io/badge/license-MIT-111111.svg)](LICENSE)

[Live demo](https://wsl043.github.io/dsh-reasoning-slider/) · [Install](#install) · [Modes](#three-modes-one-plugin) · [简体中文](README.zh-CN.md)

</div>

<p align="center">
  <a href="https://wsl043.github.io/dsh-reasoning-slider/"><img src="https://raw.githubusercontent.com/WSL043/dsh-reasoning-slider/main/docs/assets/reasoning-slider-hero-dark-en.png" width="900" alt="Dark DeepSeek Harness composer with the Energy effort slider enlarged"></a>
</p>

## Why this plugin

DSH models can advertise different reasoning-effort levels. This plugin keeps
the composer to two small pills—model and effort—and opens the exact advertised
levels in a compact slider only when you need it. It does not invent unsupported
capabilities or change provider routing.

- **Model-aware:** uses only the levels reported by the selected model.
- **Efficient:** dragging is local preview; DSH receives one selection on release.
- **Native:** separates model selection from a 28 px effort pill and follows DSH tokens and contracts.
- **Personal:** one light/dark palette for every model, or a separate palette for each model.
- **Deliberate:** keyboard input works; Native stays still, while choosing Energy explicitly enables motion.
- **Private:** no credentials, account access, telemetry, or plugin-owned network calls.

## Beta status

The model contract and safe DSH integration are tested, while the visual
renderers and palette controls remain in active iteration. Beta updates keep
existing preferences compatible and are published for hands-on feedback before
the visual API is declared stable.

## Three modes, one plugin

Choose the presentation in **Settings -> Effort · Beta**:

| Mode | Behavior |
| --- | --- |
| **Official** | Restores DSH's unmodified model selector |
| **Native** | Adds a quiet effort pill with a compact popover slider |
| **Energy** | Adds a brief, independently implemented WebGL cell-and-bloom effect while dragging and settling |

The plugin market remains the place to install, update, disable, or remove the
plugin. The setting changes presentation without installing duplicate plugins.

Energy mode uses one production cellular renderer during effort changes. Off
and intermediate levels become visually still after settling, while the
model's maximum effort keeps the field burning. It
preserves the pixel field and ignition character while using constant
CSS-pixel propagation, so a longer rail does not make the animation appear to
slow down. Light and dark appearances each offer paired presets plus editable
**effect** and **track** colors. Choose **All models** to share both palettes,
or **Per model** to remember them for each discovered model. Existing two-color
preferences keep their effect colors and receive the recommended track defaults.
The motion is Claude-inspired, but the implementation and model contract remain
provider-neutral.

<p align="center">
  <a href="https://wsl043.github.io/dsh-reasoning-slider/"><img src="https://raw.githubusercontent.com/WSL043/dsh-reasoning-slider/main/docs/assets/reasoning-slider-energy-dark.gif" width="612" alt="High-resolution animation of the effort slider moving from Off through Max"></a>
</p>

Try the same production renderer on the [interactive experience page](https://wsl043.github.io/dsh-reasoning-slider/). It supports dragging, keyboard input, light/dark appearance, and live color adjustment without connecting to an account.

<p align="center">
  <img src="https://raw.githubusercontent.com/WSL043/dsh-reasoning-slider/main/docs/assets/mode-settings-en.png" width="820" alt="DSH Reasoning control settings with Energy mode and separate light and dark palettes">
</p>

## Install

Use the standard DSH command:

```sh
dsh plugin --profile web add dsh-reasoning-slider
```

Then restart DSH. The same official command works with DSH distributions that
provide `dsh`. This plugin is tested against the latest DSH release shown in
the package metadata.

Update or uninstall:

```sh
dsh plugin --profile web update dsh-reasoning-slider
dsh plugin --profile web remove dsh-reasoning-slider
```

## Behavior and limits

- The selected effort applies through DSH's normal model-selection contract.
- Models with fewer than two advertised effort levels keep the standard model
  selector and show no artificial slider choices.
- Energy rendering runs only while its compact popover is open. It appears
  briefly while the effort changes, becomes still after settling on Off or an
  intermediate level, and remains active at the maximum advertised effort.
  Closing the popover unloads it; choose Native for a still control.
- This plugin does not show DeepSeek balance or quota. Account-specific balance
  access belongs in a separate plugin with explicit permissions and failure UI.

This community project is not affiliated with or endorsed by DeepSeek.

[Report a bug](https://github.com/WSL043/dsh-reasoning-slider/issues) · [Security](SECURITY.md) · [MIT](LICENSE)
