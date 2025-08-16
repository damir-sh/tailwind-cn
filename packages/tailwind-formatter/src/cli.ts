#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs/promises";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import fg from "fast-glob";
import { formatClasses } from "./index.js";

export async function formatTailwindInDir(
	dir: string,
	opts?: { dry?: boolean; useCn?: boolean; debug?: boolean }
) {
	const DRY = !!opts?.dry;
	const USE_CN = !!opts?.useCn;
	const DEBUG = !!opts?.debug || process.env.TW_DEBUG === "1";
	const GLOB = path.join(dir, "**/*.{js,jsx,ts,tsx}");
	const files = await fg(GLOB, {
		ignore: ["**/node_modules/**"],
		absolute: true,
	});

	let changed = 0;

	for (const file of files) {
		if (DEBUG) console.log(`[tailwind-formatter] scanning: ${file}`);
		const code = await fs.readFile(file, "utf8");
		const ast = parse(code, {
			sourceType: "module",
			plugins: ["jsx", "typescript"],
		});

		let mutated = false;

		const isClassAttr = (node: any) =>
			t.isJSXAttribute(node) &&
			(node.name.name === "className" || node.name.name === "class");

		const getLiteralString = (node: any) => {
			if (t.isStringLiteral(node)) return node.value;
			if (
				t.isJSXExpressionContainer(node) &&
				t.isStringLiteral(node.expression)
			)
				return node.expression.value;
			return null;
		};

		const setLiteralString = (node: any, value: string) => {
			if (t.isStringLiteral(node)) node.value = value;
			else if (
				t.isJSXExpressionContainer(node) &&
				t.isStringLiteral(node.expression)
			)
				node.expression.value = value;
		};

		const isCnCall = (path: any) => {
			if (!t.isCallExpression(path.node)) return false;
			const callee = path.node.callee;
			if (t.isIdentifier(callee))
				return ["cn", "clsx", "cx", "classnames", "classNames"].includes(
					callee.name
				);
			if (t.isMemberExpression(callee) && t.isIdentifier(callee.property))
				return ["cn", "clsx", "cx", "classnames", "classNames"].includes(
					callee.property.name
				);
			return false;
		};

		const getStaticStringArg = (node: any): string | null => {
			if (t.isStringLiteral(node)) return node.value;
			if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
				return node.quasis.map((q) => q.value.cooked || "").join("");
			}
			return null;
		};

		// @ts-ignore
		traverse.default(ast, {
			JSXAttribute(path: any) {
				if (!isClassAttr(path.node)) {
					return;
				}
				const raw = getLiteralString(path.node.value);
				if (!raw) {
					return;
				}
				if (DEBUG)
					console.log(
						`[tailwind-formatter] JSX class attr found in ${file}: raw="${raw}" USE_CN=${USE_CN}`
					);
				if (USE_CN) {
					// pick an available helper name in scope
					const candidates = ["cn", "clsx", "cx", "classnames", "classNames"];
					let helper = candidates.find((n) => path.scope.hasBinding(n));
					const groups =
						(formatClasses(raw, {
							splitPerGroup: true,
						}) as unknown as string[]) || [];
					if (DEBUG)
						console.log(
							`[tailwind-formatter] JSX wrap check helper=${
								helper ?? "<none>"
							} groups=${JSON.stringify(groups)}`
						);
					// If no helper in scope, try to auto-insert: import classNames from "classnames";
					if (!helper && groups.length > 0) {
						const programPath: any = path.findParent((p: any) => p.isProgram());
						const alreadyHasClassNames = programPath.node.body.some(
							(n: any) =>
								t.isImportDeclaration(n) && n.source.value === "classnames"
						);
						if (!alreadyHasClassNames) {
							const importDecl = t.importDeclaration(
								[t.importDefaultSpecifier(t.identifier("classNames"))],
								t.stringLiteral("classnames")
							);
							programPath.node.body.unshift(importDecl);
							if (DEBUG)
								console.log(
									`[tailwind-formatter] inserted import: import classNames from "classnames"`
								);
						}
						helper = "classNames";
					}
					if (helper && groups.length > 0) {
						const call = t.callExpression(
							t.identifier(helper),
							groups.map((g) => t.stringLiteral(g))
						);
						const expr = t.jsxExpressionContainer(call);
						// Replace literal value with expression container
						path.node.value = expr;
						mutated = true;
						if (DEBUG)
							console.log(
								`[tailwind-formatter] JSX class wrapped with ${helper}()`
							);
						return;
					}
				}
				const pretty = formatClasses(raw);
				if (pretty !== raw) {
					setLiteralString(path.node.value, pretty);
					mutated = true;
					if (DEBUG)
						console.log(`[tailwind-formatter] JSX class sorted -> "${pretty}"`);
				}
			},
			CallExpression(path: any) {
				if (!isCnCall(path)) {
					return;
				}
				const args = path.node.arguments;
				if (DEBUG)
					console.log(`[tailwind-formatter] cn-like call found in ${file}`);
				if (USE_CN) {
					const stringLiteralIndices = args
						.map((a: any, i: number) =>
							getStaticStringArg(a) !== null ? i : -1
						)
						.filter((i: number) => i >= 0);
					if (stringLiteralIndices.length > 0) {
						const combined = stringLiteralIndices
							.map((i: number) => getStaticStringArg(args[i]) as string)
							.join(" ");
						const groups =
							(formatClasses(combined, {
								splitPerGroup: true,
							}) as unknown as string[]) || [];
						if (DEBUG)
							console.log(
								`[tailwind-formatter] cn-like combined="${combined}" groups=${JSON.stringify(
									groups
								)}`
							);
						if (groups.length > 0) {
							const groupedNodes = groups.map((g) => t.stringLiteral(g));
							const firstIndex = stringLiteralIndices[0];
							const newArgs: any[] = [];
							for (let i = 0; i < firstIndex; i++) newArgs.push(args[i]);
							for (const node of groupedNodes) newArgs.push(node);
							for (let i = firstIndex + 1; i < args.length; i++) {
								if (getStaticStringArg(args[i]) === null) newArgs.push(args[i]);
							}
							const originalSingle = stringLiteralIndices.length === 1;
							const originalCombinedValue = getStaticStringArg(
								args[stringLiteralIndices[0]]
							);
							const originalCombinedEqualsSingle =
								originalSingle &&
								groups.length === 1 &&
								groups[0] === originalCombinedValue;
							if (
								!originalCombinedEqualsSingle ||
								groups.length > 1 ||
								!originalSingle
							) {
								path.node.arguments = newArgs as any;
								mutated = true;
								if (DEBUG)
									console.log(`[tailwind-formatter] cn-like args regrouped`);
							}
						}
					}
				} else if (args.length === 1 && getStaticStringArg(args[0]) !== null) {
					const raw = getStaticStringArg(args[0]) as string;
					const pretty = formatClasses(raw);
					if (pretty !== raw) {
						args[0] = t.stringLiteral(pretty);
						mutated = true;
						if (DEBUG)
							console.log(
								`[tailwind-formatter] cn-like single arg sorted -> "${pretty}"`
							);
					}
				}
			},
		});

		if (mutated) {
			// @ts-ignore
			const output = generate.default(ast, { retainLines: true }, code).code;
			if (!DRY) {
				await fs.writeFile(file, output, "utf8");
			}
			changed++;
			console.log(`${DRY ? "[dry] " : ""}formatted: ${file}`);
		}
	}

	console.log(
		changed ? `Done. Updated ${changed} file(s).` : "No changes needed."
	);
}

// CLI execution

const args = process.argv.slice(2);

// Validate arguments - only allow --dry, --use-cn, and directory path
const allowedFlags = ["--dry", "--use-cn", "--debug"];
const invalidArgs = args.filter(
	(arg) => arg.startsWith("--") && !allowedFlags.includes(arg)
);

if (invalidArgs.length > 0) {
	console.error(`Invalid arguments: ${invalidArgs.join(", ")}`);
	console.error("Allowed flags: --dry, --use-cn");
	process.exit(1);
}

const dry = args.includes("--dry");
const useCn = args.includes("--use-cn");
const debug = args.includes("--debug") || process.env.TW_DEBUG === "1";
const dir = args.find((a) => !a.startsWith("--")) || "src";

if (debug)
	console.log(
		`[tailwind-formatter] start dir=${dir} DRY=${dry} USE_CN=${useCn} DEBUG=${debug}`
	);

formatTailwindInDir(dir, { dry, useCn, debug }).catch((err) => {
	console.error("Error occurred:", err);
	process.exit(1);
});
