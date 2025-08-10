export type GroupKey =
	| "layout"
	| "spacing"
	| "sizing"
	| "typography"
	| "colors"
	| "borders"
	| "effects"
	| "interactivity"
	| "accessibility"
	| "misc";

export type FormatOptions = {
	groupOrder?: GroupKey[];
	splitPerGroup?: boolean;
	strictTailwindOrder?: boolean; // reserved for future parity mode
	tailwind?: {
		prefix?: string; // e.g. "tw-"
		variants?: string[]; // priority list, e.g. ["sm","md","lg","hover","focus","dark"]
		customUtilities?: Array<RegExp | string>; // plugin utilities to keep as known tokens
	};
};
