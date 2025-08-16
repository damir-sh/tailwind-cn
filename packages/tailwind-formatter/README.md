# tailwind-cn

**A Tailwind CSS class formatter** that groups utilities into semantic buckets (layout, spacing, colors, etc.) and outputs them in a consistent, readable order. Perfect for use inside `cn()`, `clsx()`, or plain `className` strings.

## Features

- Groups related Tailwind utilities: layout, spacing, sizing, typography, colors, borders, effects, interactivity, accessibility.
- Respects variant prefixes (`sm:`, `hover:`, `[&>*]:`) and arbitrary values.
- Supports custom **prefix**, **variants**, and plugin utilities via options.
- Idempotent output — safe to run multiple times.
- Core library can be used in:
  - Prettier plugin
  - VS Code extension
  - CLI codemod

## Install

```bash
npm install tailwind-formatter --save-dev
```

TBD
