import { FormatOptions, GroupKey } from "./types";

// --- Defaults ----------------------------------------------------------------
/**
 * Default order for grouping Tailwind CSS classes.
 * Classes are organized from structural/layout to visual/interactive properties.
 */
const DEFAULT_ORDER: GroupKey[] = [
	"layout", // display, position, flex/grid properties
	"spacing", // padding, margin, space utilities
	"sizing", // width, height, aspect ratio
	"typography", // font, text, line height, tracking
	"colors", // background, text colors, gradients
	"borders", // border, rounded corners, dividers
	"effects", // shadows, transforms, filters
	"interactivity", // cursor, transitions, animations
	"accessibility", // screen reader, aria, data attributes
	"misc", // everything else
];

/**
 * Default variants for Tailwind CSS.
 * This list is used as a fallback when no variants are provided in the configuration.
 */
const DEFAULT_VARIANTS = [
	// screens
	"sm",
	"md",
	"lg",
	"xl",
	"2xl",
	// color scheme / env
	"dark",
	"light",
	"portrait",
	"landscape",
	"motion-safe",
	"motion-reduce",
	// state
	"hover",
	"focus",
	"focus-visible",
	"focus-within",
	"active",
	"visited",
	"disabled",
	// structural
	"first",
	"last",
	"only",
	"odd",
	"even",
	// data/aria (common)
	"open",
	"checked",
	"required",
	"invalid",
	// dir
	"rtl",
	"ltr",
	// group/peer (broad catch — keeps it simple)
	"group-hover",
	"group-focus",
	"peer-hover",
	"peer-focus",
];

// --- Utils -------------------------------------------------------------------
/**
 * Escapes special regex characters in a string to make it safe for use in RegExp.
 */
function escapeRegex(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Creates a regex to match Tailwind variant prefixes (e.g., "sm:", "hover:", "[&>*]:").
 * Supports both standard variants and arbitrary variants in square brackets.
 */
function makeVariantRegex(variants?: string[]) {
	const baseList = variants && variants.length ? variants : DEFAULT_VARIANTS;
	const arb = "\\[[^\\]]+\\]";
	const list = baseList.map(escapeRegex).join("|");
	const union = `${arb}|(?:${list})`;
	return new RegExp(`^(?:${union}):`, "i");
}
/**
 * Splits a string of class names by whitespace while preserving arbitrary values
 * in square brackets (e.g., "bg-[color:var(--x)]" stays intact).
 */
function splitTokens(input: string): string[] {
	const out: string[] = [];
	let cur = "";
	let depth = 0;
	for (let i = 0; i < input.length; i++) {
		const ch = input[i];
		if (ch === "[") depth++;
		if (ch === "]" && depth > 0) depth--;
		if (/\s/.test(ch) && depth === 0) {
			if (cur) out.push(cur);
			cur = "";
		} else {
			cur += ch;
		}
	}
	if (cur) out.push(cur);
	return out.filter(Boolean);
}

/**
 * Strips variant prefixes from a class token and returns the base class plus variant info.
 * Example: "sm:hover:text-red-500" → { variant: "sm:hover:", base: "text-red-500", variants: ["sm", "hover"] }
 */
function stripVariantsWith(
	partsRe: RegExp,
	token: string
): { variant: string; base: string; variants: string[] } {
	let v = "";
	let rest = token;
	const vs: string[] = [];
	while (partsRe.test(rest)) {
		const m = rest.match(partsRe)!; // e.g., "sm:" or "[&>*]:"
		const raw = m[0];
		v += raw;
		const label = raw.slice(0, -1); // remove trailing ":"
		vs.push(label);
		rest = rest.slice(raw.length);
	}
	return { variant: v, base: rest, variants: vs };
}

/**
 * Modifies a regex to account for Tailwind's prefix option.
 * If a prefix is set (e.g., "tw-"), it gets injected at the start of regex patterns.
 */
function withPrefix(prefix = "", re: RegExp): RegExp {
	if (!prefix) return re;
	const px = escapeRegex(prefix);
	const src = re.source.replace(/^\^/, `^${px}`);
	return new RegExp(src, re.flags);
}

// --- Classification -----------------------------------------------------------
/**
 * Classifies a base class name (without variants) into one of the predefined groups.
 * Uses regex patterns to match common Tailwind utility prefixes and patterns.
 */
function classifyWithConfig(
	base: string,
	tw?: FormatOptions["tailwind"]
): GroupKey {
	// treat declared plugin utilities as "known" (for now: put in misc bucket)
	if (tw?.customUtilities) {
		for (const pat of tw.customUtilities) {
			if (typeof pat === "string") {
				if (base.startsWith(pat)) return "misc";
			} else if (pat instanceof RegExp) {
				if (pat.test(base)) return "misc";
			}
		}
	}

	// Helper to apply prefix to regex patterns
	const re = (r: RegExp) => withPrefix(tw?.prefix, r);

	// Layout: display, positioning, flexbox, grid, etc.
	if (
		re(
			/^(container|block|inline|flex|grid|table|flow-|contents|col-|row-|justify-|items-|content-|place-|order-|gap-)/
		).test(base)
	)
		return "layout";

	// Spacing: padding, margin, space between elements
	if (re(/^(p[trblxy]?-.+|m[trblxy]?-.+|space-[xy]-)/).test(base))
		return "spacing";

	// Sizing: width, height, min/max dimensions, aspect ratio
	if (re(/^(w-|h-|min-w-|max-w-|min-h-|max-h-|aspect-)/).test(base))
		return "sizing";

	// Typography: font properties, text size, line height, etc.
	if (
		re(
			/^(font-|text-(?:xs|sm|base|lg|xl|\[)|leading-|tracking-|list-|truncate|line-clamp-)/
		).test(base)
	)
		return "typography";

	// Colors: backgrounds, text colors, gradients, decorations, shadows, opacity
	if (
		re(
			/^(bg-|text-(?!xs|sm|base|lg|xl)|from-|via-|to-|decoration-|underline|ring-|shadow-|opacity-)/
		).test(base)
	)
		return "colors";

	// Borders: border styles, rounded corners, dividers, outlines
	if (re(/^(border|rounded|divide-|outline)/).test(base)) return "borders";

	// Effects: shadows, transforms, filters, backdrop filters
	if (
		re(
			/^(shadow-|blur|backdrop-|transform|scale-|rotate-|translate-|skew-)/
		).test(base)
	)
		return "effects";

	// Interactivity: cursor, user selection, transitions, animations
	if (
		re(
			/^(cursor-|select-|pointer-events-|accent-|appearance-|scroll-|transition|duration-|ease-|animate-)/
		).test(base)
	)
		return "interactivity";

	// Accessibility: screen reader utilities, aria attributes, data attributes
	if (re(/^(sr-only|not-sr-only|aria-|data-)/).test(base))
		return "accessibility";

	// Default fallback for unrecognized utilities
	return "misc";
}

/**
 * Intra-group ordering hints for stable sorting within each group.
 * Lower index = appears earlier in the final output.
 * These patterns help maintain consistent ordering of related utilities.
 */
const ORDER_HINTS = [
	/^container$/, // container utility comes first
	/^(block|inline.*|contents)$/, // display utilities
	/^(flex|grid|table)$/, // layout method utilities
	/^col-.*|row-.*$/, // grid column/row utilities
	/^gap-.*$/, // gap utilities
	/^justify-.*|items-.*|content-.*|place-.*|order-.*$/, // alignment utilities
	/^p.*/, // padding utilities
	/^m.*/, // margin utilities
	/^space-.*/, // space between utilities
	/^(w-|h-|min-|max-|aspect-)/, // sizing utilities
	/^(font-|text-(xs|sm|base|lg|xl|\[)|leading-|tracking-|list-|truncate|line-clamp-)/, // typography
	/^(bg-|text-(?!xs|sm|base|lg|xl)|from-|via-|to-|decoration-|underline|ring-|shadow-|opacity-)/, // colors
	/^(border|rounded|divide-|outline)/, // borders
	/^(transform|scale-|rotate-|translate-|skew-|blur|backdrop-)/, // effects/transforms
	/^(cursor-|select-|pointer-events-|accent-|appearance-|scroll-|transition|duration-|ease-|animate-)/, // interactivity
	/^(sr-only|not-sr-only|aria-|data-)/, // accessibility
];

/**
 * Returns a numeric score for ordering utilities within their group.
 * Lower scores appear earlier in the final output.
 */
function baseScore(base: string): number {
	for (let i = 0; i < ORDER_HINTS.length; i++) {
		if (ORDER_HINTS[i].test(base)) return i;
	}
	return ORDER_HINTS.length + 1;
}

/**
 * Returns a priority score for variant ordering based on the configured variant order.
 * Earlier variants in the order array get lower scores (higher priority).
 */
function variantPriorityScore(variants: string[], order?: string[]): number {
	if (!order || order.length === 0 || variants.length === 0) return 9999;
	for (const v of variants) {
		const idx = order.indexOf(v);
		if (idx !== -1) return idx;
	}
	return 9999;
}

// --- Public API --------------------------------------------------------------
/**
 * Main function to format and sort Tailwind CSS classes.
 * Groups classes by type and sorts them within each group for consistent output.
 *
 * @param input - String of space-separated class names
 * @param opts - Configuration options for formatting behavior
 * @returns Formatted class string or array of group strings (if splitPerGroup is true)
 */
// Overloads to provide precise return types based on `splitPerGroup`
export function formatClasses(
	input: string,
	opts: FormatOptions & { splitPerGroup: true }
): string[];
export function formatClasses(
	input: string,
	opts?: FormatOptions & { splitPerGroup?: false }
): string;
export function formatClasses(input: string, opts: FormatOptions = {}) {
	const order = opts.groupOrder ?? DEFAULT_ORDER;
	const tw = opts.tailwind;
	const variantRe = makeVariantRegex(tw?.variants);

	const tokens = splitTokens(input);

	// Initialize buckets for each group
	const buckets = new Map<GroupKey, string[]>();
	for (const k of order) buckets.set(k, []);
	if (!buckets.has("misc")) buckets.set("misc", []);

	// Parse and classify each token
	const parsed = tokens.map((t, i) => {
		const { base, variants } = stripVariantsWith(variantRe, t);
		const g = classifyWithConfig(base, tw);
		return {
			token: t,
			base,
			variants,
			group: g,
			idx: i, // original position for stable sorting
			sBase: baseScore(base),
			sVar: variantPriorityScore(variants, tw?.variants),
		};
	});

	// Distribute tokens into their respective group buckets
	for (const item of parsed) {
		buckets.get(item.group)!.push(item.token);
	}

	// Sort within each bucket by: variant priority → base score → original index
	// This ensures stable, predictable ordering
	for (const [k, arr] of buckets) {
		const items = arr.map((t) => parsed.find((p) => p.token === t)!) as any[];
		items.sort((a, b) => a.sVar - b.sVar || a.sBase - b.sBase || a.idx - b.idx);
		buckets.set(
			k,
			items.map((x) => x.token)
		);
	}

	// Return format depends on splitPerGroup option
	if (opts.splitPerGroup) {
		return order
			.map((k) => buckets.get(k)!)
			.filter((g) => g.length)
			.map((g) => g.join(" "));
	}

	return order
		.flatMap((k) => buckets.get(k)!)
		.join(" ")
		.trim();
}

/**
 * Helper function to tokenize a class string without formatting.
 * Useful for editor integrations that need to work with individual tokens.
 */
export function tokenize(input: string) {
	return splitTokens(input);
}

/**
 * Categorizes classes into groups without formatting or sorting.
 * Returns an object with each group as a key and its classes as an array.
 * Useful for analysis or custom formatting logic.
 */
export function categorize(
	input: string,
	opts: Pick<FormatOptions, "tailwind" | "groupOrder"> = {}
) {
	const order = opts.groupOrder ?? DEFAULT_ORDER;

	// Initialize map with all possible groups
	const map: Record<GroupKey, string[]> = {
		layout: [],
		spacing: [],
		sizing: [],
		typography: [],
		colors: [],
		borders: [],
		effects: [],
		interactivity: [],
		accessibility: [],
		misc: [],
	};

	const variantRe = makeVariantRegex(opts.tailwind?.variants);

	// Classify each token and add to appropriate group
	for (const t of splitTokens(input)) {
		const { base } = stripVariantsWith(variantRe, t);
		const g = classifyWithConfig(base, opts.tailwind);
		map[g].push(t);
	}

	// Return groups in the specified order for predictable iteration
	const ordered: Record<GroupKey, string[]> = {} as any;
	for (const k of order) ordered[k] = map[k];
	if (!ordered.misc) ordered.misc = map.misc;
	return ordered;
}
