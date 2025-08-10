#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs/promises";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import fg from "fast-glob";
import { formatClasses } from "./index.js"; // import from core

export async function formatTailwindInDir(
	dir: string,
	opts?: { dry?: boolean }
) {
	const DRY = !!opts?.dry;
	const GLOB = path.join(dir, "**/*.{js,jsx,ts,tsx}");
	const files = await fg(GLOB, {
		ignore: ["**/node_modules/**"],
		absolute: true,
	});

	let changed = 0;

	for (const file of files) {
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
				return ["cn", "clsx", "cx"].includes(callee.name);
			if (t.isMemberExpression(callee) && t.isIdentifier(callee.property))
				return ["cn", "clsx", "cx"].includes(callee.property.name);
			return false;
		};

		traverse(ast, {
			JSXAttribute(path) {
				if (!isClassAttr(path.node)) return;
				const raw = getLiteralString(path.node.value);
				if (!raw) return;
				const pretty = formatClasses(raw);
				if (pretty !== raw) {
					setLiteralString(path.node.value, pretty);
					mutated = true;
				}
			},
			CallExpression(path) {
				if (!isCnCall(path)) return;
				const args = path.node.arguments;
				if (args.length === 1 && t.isStringLiteral(args[0])) {
					const raw = args[0].value;
					const pretty = formatClasses(raw);
					if (pretty !== raw) {
						args[0] = t.stringLiteral(pretty);
						mutated = true;
					}
				}
			},
		});

		if (mutated) {
			const output = generate(ast, { retainLines: true }, code).code;
			if (!DRY) await fs.writeFile(file, output, "utf8");
			changed++;
			console.log(`${DRY ? "[dry] " : ""}formatted: ${file}`);
		}
	}

	console.log(
		changed ? `Done. Updated ${changed} file(s).` : "No changes needed."
	);
}

// CLI execution
if (require.main === module) {
	const args = process.argv.slice(2);
	const dry = args.includes("--dry");
	const dir = args.find((a) => !a.startsWith("--")) || "src";
	formatTailwindInDir(dir, { dry }).catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
