# @damir-sh/tailwind-formatter

**A Tailwind CSS class formatter** that groups utilities into semantic buckets (layout, spacing, colors, etc.) and outputs them in a consistent, readable order.

## Features

- Groups related Tailwind utilities: layout, spacing, sizing, typography, colors, borders, effects, interactivity, accessibility.
- Respects variant prefixes (`sm:`, `hover:`, `[&>*]:`) and arbitrary values.
- Supports custom **prefix**, **variants**, and plugin utilities via options.
- Idempotent output — safe to run multiple times.

## Install

```bash
npm install tailwind-formatter --save-dev
```

```bash
npx tailwind-formatter src
```

```bash
npx tailwind-formatter src --use-cn
```
