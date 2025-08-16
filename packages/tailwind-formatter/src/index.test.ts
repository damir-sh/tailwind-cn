import { describe, it, expect } from "vitest";
import { formatClasses, categorize, tokenize } from "./index";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

describe("tailwind-formatter", () => {
	it("groups + orders basics", () => {
		const out = formatClasses(
			"text-red-500 p-4 flex md:hover:bg-blue-500 rounded-lg items-center"
		);
		expect(out).toBe(
			"flex items-center p-4 text-red-500 md:hover:bg-blue-500 rounded-lg"
		);
	});

	it("preserves arbitrary values", () => {
		const out = formatClasses("bg-[color:var(--x)] p-2");
		expect(out).toBe("p-2 bg-[color:var(--x)]");
	});

	it("keeps variant chains intact", () => {
		const out = formatClasses("hover:text-white sm:p-2 md:p-4");
		// spacing (sm, md) comes before colors (hover:text-...)
		expect(out.startsWith("sm:p-2 md:p-4")).toBe(true);
		expect(out.includes("hover:text-white")).toBe(true);
	});

	it("splitPerGroup returns array chunks in group order", () => {
		const out = formatClasses("flex p-2 text-red-500 rounded", {
			splitPerGroup: true,
		}) as string[];
		expect(out).toEqual(["flex", "p-2", "text-red-500", "rounded"]);
	});

	it("tokenize handles bracketed values", () => {
		expect(tokenize("bg-[var(--c)] text-sm").length).toBe(2);
	});

	it("config: respects prefix", () => {
		const out = formatClasses("tw-flex tw-p-4 tw-text-red-500", {
			tailwind: { prefix: "tw-" },
		});
		expect(out).toBe("tw-flex tw-p-4 tw-text-red-500");
	});

	it("config: variant priority influences intra-group order", () => {
		const out = formatClasses("hover:bg-blue-500 sm:bg-red-500", {
			tailwind: { variants: ["sm", "md", "lg", "hover"] },
		});
		// both are colors; sm has higher priority so should come first
		expect(out).toBe("sm:bg-red-500 hover:bg-blue-500");
	});

	it("categorize returns buckets", () => {
		const cat = categorize("flex p-2 text-red-500");
		expect(cat.layout).toEqual(["flex"]);
		expect(cat.spacing).toEqual(["p-2"]);
		expect(cat.colors).toEqual(["text-red-500"]);
	});

	it("cli: groups cn calls into separate args when --use-cn", async () => {
		const code = `
			import { cn } from './x';
			const a = cn("text-red-500 p-2 flex rounded");
		`;
		const ast = parse(code, {
			sourceType: "module",
			plugins: ["jsx", "typescript"],
		});

		let output = code;
		// Inline minimal transform similar to CLI
		traverse(ast as any, {
			CallExpression(path: any) {
				if (!t.isCallExpression(path.node)) return;
				const callee = path.node.callee;
				if (!(t.isIdentifier(callee) && callee.name === "cn")) return;
				const args = path.node.arguments;
				if (args.length === 1 && t.isStringLiteral(args[0])) {
					const groups = formatClasses(args[0].value, {
						splitPerGroup: true,
					}) as string[];
					if (groups.length > 1) {
						path.node.arguments = groups.map((g) => t.stringLiteral(g));
					}
				}
			},
		});
		output = (generate as any).default
			? (generate as any).default(ast).code
			: (generate as any)(ast).code;
		expect(
			output.includes('cn("flex", "p-2", "text-red-500", "rounded")')
		).toBe(true);
	});
});
