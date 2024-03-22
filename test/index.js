import test from "node:test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cp, readlink, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import assert from "node:assert";

const testDir = join(fileURLToPath(import.meta.url), "..");
const testCases = [
	{
		name: "all",
		start: ["foo", "bar", "baz"],
		links: [
			["foo/node_modules/@workspace/bar/dist_bar_1", "workspace/bar/dist_bar_1"],
			["foo/node_modules/@workspace/bar/dist_bar_2", "workspace/bar/dist_bar_2"],
			["foo/node_modules/@workspace/baz/dist_baz", "workspace/baz/dist_baz"],
			["foo/node_modules/nested/node_modules/@workspace/baz/dist_baz", "workspace/baz/dist_baz"],
			["workspace/node_modules/@workspace/bar/dist_bar_1", "workspace/bar/dist_bar_1"],
			["workspace/node_modules/@workspace/bar/dist_bar_2", "workspace/bar/dist_bar_2"],
			["workspace/node_modules/foo/dist_foo", "foo/dist_foo"],
			["workspace/baz/node_modules/foo/dist_foo", "foo/dist_foo"],
			["workspace/baz/node_modules/@workspace/bar/dist_bar_1", "workspace/bar/dist_bar_1"],
			["workspace/baz/node_modules/@workspace/bar/dist_bar_2", "workspace/bar/dist_bar_2"],
		],
		skipped: [
			"workspace/bar/node_modules/@workspace/baz/dist_baz",
		],
	},
	{
		name: "foo_bar",
		start: ["foo", "bar"],
		links: [
			["foo/node_modules/@workspace/bar/dist_bar_1", "workspace/bar/dist_bar_1"],
			["foo/node_modules/@workspace/bar/dist_bar_2", "workspace/bar/dist_bar_2"],
			["workspace/node_modules/foo/dist_foo", "foo/dist_foo"],
			["workspace/baz/node_modules/foo/dist_foo", "foo/dist_foo"],
		],
		skipped: [
			"foo/node_modules/@workspace/baz/dist_baz",
			"foo/node_modules/nested/node_modules/@workspace/baz/dist_baz",
			"workspace/node_modules/@workspace/bar/dist_bar_1",
			"workspace/node_modules/@workspace/bar/dist_bar_2",
			"workspace/bar/node_modules/@workspace/baz/dist_baz",
		],
	},
];

for (const testCase of testCases) {
	await test(testCase.name, async () => {
		const env = await prepareEnv(testCase.name);
		const portals = [];
		try {
			if (testCase.start.includes("foo")) {
				portals.push(startPortal(join(env, "foo"), ["dist_foo"]));
			}
			if (testCase.start.includes("bar")) {
				portals.push(startPortal(join(env, "workspace/bar"), ["dist_bar_1", "dist_bar_2"]));
			}
			if (testCase.start.includes("baz")) {
				portals.push(startPortal(join(env, "workspace/baz"), ["dist_baz"]));
			}
			await new Promise(r => setTimeout(r, 1000));
			for (const [path, target] of testCase.links) {
				await verifySymlink(join(env, target), join(env, path));
			}
			for (const path of testCase.skipped) {
				await verifySkipped(path);
			}
		} finally {
			await Promise.all(portals.map(p => p.then(p => p.kill())));
			await new Promise(r => setTimeout(r, 500));
		}
	});
}

function startPortal(cwd, args) {
	return new Promise((resolve, reject) => {
		const proc = spawn(process.execPath, [
			join(testDir, "../cli.js"),
			...args,
		], {
			cwd,
			shell: false,
			stdio: ["ignore", "ignore", 2],
		});
		proc.on("error", reject);
		proc.on("spawn", () => {
			resolve({
				kill() {
					if (!proc.killed) {
						return new Promise(resolve => {
							proc.on("exit", resolve);
							proc.kill();
						});
					}
				}
			});
		});
	});
}

async function verifySymlink(target, path) {
	const actualTarget = await readlink(path);
	assert.strictEqual(actualTarget, target);
}

async function verifySkipped(path) {
	assert(await readlink(path).then(() => false, () => true));
}

async function prepareEnv(name) {
	const data = join(testDir, "data");
	const env = join(testDir, "env", name);
	await rm(env, { recursive: true, force: true });
	await cp(data, env, { recursive: true });
	return env;
}
