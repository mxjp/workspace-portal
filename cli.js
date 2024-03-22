#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { renewSymlink, resolveFile } from "./lib/fs.js";
import { createPeer } from "./lib/peer.js";
import { dirname, join } from "node:path";
import { getPackageName } from "./lib/npm.js";

const VERSION = "workspace-portal-v1";

const link = process.argv.slice(2);

const packageLockFilename = await resolveFile("package-lock.json");
const packageLockContext = dirname(packageLockFilename);
const packageLock = JSON.parse(await readFile(packageLockFilename, "utf-8"));

const packageFilename = await resolveFile("package.json");
const packageInfo = JSON.parse(await readFile(packageFilename, "utf-8"));

const linked = new Set();
createPeer({
	port: 28717,
	info: {
		version: VERSION,
		name: packageInfo.name,
		root: dirname(packageFilename),
		link,
	},
	onInfo: info => {
		if (info.version !== VERSION || linked.has(info.name)) {
			return;
		}
		linked.add(info.name);
		if (info.link.length > 0) {
			for (const relPath in packageLock.packages) {
				const name = getPackageName(relPath);
				if (name === info.name) {
					const packageInfo = packageLock.packages[relPath];
					if (packageInfo.link) {
						console.log(`Skipping ${JSON.stringify(join(packageLockContext, relPath))} because it has already been linked by npm.`);
					}
					for (const link of info.link) {
						const target = join(info.root, link);
						const path = join(packageLockContext, relPath, link);
						console.log(`Symlinking ${JSON.stringify(target)} into ${JSON.stringify(path)}`);
						renewSymlink(target, path);
					}
				}
			}
		}
	},
});
