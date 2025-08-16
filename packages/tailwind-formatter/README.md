# @damir-sh/tailwind-formatter

**A Tailwind CSS class formatter** that groups utilities into semantic buckets and outputs them in a consistent, readable order. Perfect for maintaining clean, organized Tailwind code across your project.

## ✨ Features

- **Semantic Grouping**: Organizes classes into logical groups (layout, spacing, colors, etc.)
- **Variant Preservation**: Respects all variant prefixes (`sm:`, `hover:`, `[&>*]:`, etc.)
- **Arbitrary Value Support**: Handles arbitrary values like `bg-[color:var(--x)]` correctly
- **CLI & Programmatic API**: Use as a command-line tool or import into your code
- **cn() Integration**: Special support for `cn()`, `clsx()`, and similar utility functions
- **Configurable**: Custom prefixes, variants, and plugin utilities
- **Idempotent**: Safe to run multiple times without changes

## 📦 Installation

```bash
npm install @damir-sh/tailwind-formatter --save-dev
```

## 🚀 Quick Start

### Command Line Usage

Format all files in your `src` directory:

```bash
npx @damir-sh/tailwind-formatter src
```

Preview changes without modifying files:

```bash
npx @damir-sh/tailwind-formatter src --dry
```

Group classes with `cn()` function calls:

```bash
npx @damir-sh/tailwind-formatter src --use-cn
```

### Programmatic Usage

```javascript
import { formatClasses } from "@damir-sh/tailwind-formatter";

// Basic formatting
const formatted = formatClasses(
	"text-red-500 p-4 flex hover:bg-blue-500 rounded-lg items-center"
);
console.log(formatted);
// Output: "flex items-center p-4 text-red-500 hover:bg-blue-500 rounded-lg"

// Split into semantic groups
const groups = formatClasses("flex p-4 text-red-500 rounded-lg", {
	splitPerGroup: true,
});
console.log(groups);
// Output: ["flex", "p-4", "text-red-500", "rounded-lg"]
```

## 📚 API Reference

### `formatClasses(input, options?)`

Formats and sorts Tailwind CSS classes.

**Parameters:**

- `input` (string): Space-separated class names
- `options` (FormatOptions, optional): Configuration options

**Returns:**

- `string`: Formatted class string (default)
- `string[]`: Array of group strings (when `splitPerGroup: true`)

### `categorize(input, options?)`

Categorizes classes into groups without formatting.

```javascript
import { categorize } from "@damir-sh/tailwind-formatter";

const categories = categorize("flex p-2 text-red-500");
console.log(categories);
// Output: { layout: ['flex'], spacing: ['p-2'], colors: ['text-red-500'], ... }
```

### `tokenize(input)`

Splits class string into individual tokens while preserving arbitrary values.

```javascript
import { tokenize } from "@damir-sh/tailwind-formatter";

const tokens = tokenize("bg-[var(--color)] text-sm");
console.log(tokens);
// Output: ['bg-[var(--color)]', 'text-sm']
```

## ⚙️ Configuration

### CLI Options

| Flag       | Description                               |
| ---------- | ----------------------------------------- |
| `--dry`    | Preview changes without modifying files   |
| `--use-cn` | Group classes with `cn()`, `clsx()`, etc. |
| `--debug`  | Enable debug logging                      |

### FormatOptions

```typescript
interface FormatOptions {
	groupOrder?: GroupKey[]; // Custom group order
	splitPerGroup?: boolean; // Return array of groups
	tailwind?: {
		prefix?: string; // Custom prefix (e.g., "tw-")
		variants?: string[]; // Custom variant priority
		customUtilities?: (RegExp | string)[]; // Plugin utilities
	};
}
```

### Group Order

Classes are organized into these semantic groups by default:

1. **layout** - `display`, `position`, `flex`, `grid` properties
2. **spacing** - `padding`, `margin`, `space` utilities
3. **sizing** - `width`, `height`, `min/max` dimensions
4. **typography** - `font`, `text`, `leading`, `tracking`
5. **colors** - `background`, `text` colors, `gradients`
6. **borders** - `border`, `rounded`, `divide`, `outline`
7. **effects** - `shadow`, `transform`, `filter`, `backdrop`
8. **interactivity** - `cursor`, `transition`, `animation`
9. **accessibility** - `sr-only`, `aria-*`, `data-*`
10. **misc** - everything else

## 🎯 Examples

### Basic Formatting

**Input:**

```html
<div
	className="text-red-500 p-4 flex md:hover:bg-blue-500 rounded-lg items-center"
></div>
```

**Output:**

```html
<div
	className="flex items-center p-4 text-red-500 md:hover:bg-blue-500 rounded-lg"
></div>
```

### With Custom Configuration

```javascript
const formatted = formatClasses("hover:bg-blue-500 sm:bg-red-500", {
	tailwind: {
		variants: ["sm", "md", "lg", "hover"], // sm has higher priority
	},
});
// Output: "sm:bg-red-500 hover:bg-blue-500"
```

### Using `--use-cn` Flag

**Before:**

```javascript
const className = cn("text-red-500 p-4 flex rounded-lg");
```

**After:**

```javascript
const className = cn("flex", "p-4", "text-red-500", "rounded-lg");
```

### Arbitrary Values

```javascript
formatClasses("bg-[color:var(--primary)] p-[2.5rem] text-[14px]");
// Output: "p-[2.5rem] text-[14px] bg-[color:var(--primary)]"
```

### Complex Variants

```javascript
formatClasses("sm:hover:focus:text-blue-500 lg:group-hover:bg-red-500");
// Preserves all variant chains intact
```

## 🔧 CLI Usage Examples

```bash
# Format all TypeScript/JavaScript files in src
npx @damir-sh/tailwind-formatter src

# Format specific directory with dry run
npx @damir-sh/tailwind-formatter components --dry

# Use cn() grouping with debug output
npx @damir-sh/tailwind-formatter src --use-cn --debug

# Use --debug for debug output
npx @damir-sh/tailwind-formatter src --debug
```

## 🤝 Integration

### With Prettier

Add to your `.prettierignore` to avoid conflicts:

```
# Let tailwind-formatter handle class ordering
*.tsx
*.jsx
```

### With ESLint

Works well alongside ESLint rules. Run tailwind-formatter first, then ESLint.

### With VS Code

You can set up a task or use with extensions that support custom formatters.

## 📝 Supported File Types

- `.js`, `.jsx` - JavaScript and JSX files
- `.ts`, `.tsx` - TypeScript and TSX files

The formatter automatically detects and processes:

- JSX `className` and `class` attributes
- `cn()`, `clsx()`, `cx()`, `classnames()`, `classNames()` function calls

## 🐛 Troubleshooting

### Debug Mode

Enable debug logging to see what the formatter is doing:

```bash
npx @damir-sh/tailwind-formatter src --debug
```

### Common Issues

1. **Classes not being formatted**: Ensure they're in string literals, not template literals with expressions
2. **Variant order unexpected**: Check your custom variant configuration
3. **Plugin utilities not recognized**: Add them to `customUtilities` in your config

## 📄 License

MIT

## 🙏 Contributing

Issues and pull requests are welcome! Please check the existing issues before creating a new one.
