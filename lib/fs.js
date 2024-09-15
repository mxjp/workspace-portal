import { mkdir, readlink, rm, stat, symlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/**
 * @param {string} name
 * @param {string} cwd
 */
export async function resolveFile(name, cwd = process.cwd()) {
	let context = cwd;
	for (;;) {
		const filename = join(context, name);
		try {
			const stats = await stat(filename);
			if (stats.isFile()) {
				return filename;
			}
		} catch (error) {
			if (error.code !== "ENOENT") {
				throw error;
			}
		}
		const parent = dirname(context);
		if (parent === context) {
			throw new Error(`Unable to resolve ${JSON.stringify(name)} in ${JSON.stringify(cwd)}.`);
		}
		context = parent;
	}
}

/**
 * @param {string} target
 * @param {string} path
 */
export async function renewSymlink(target, path) {
	async function renew() {
		try {
			const currentTarget = resolve(await readlink(path));
			if (currentTarget === resolve(target)) {
				return;
			}
		} catch {}
		await Promise.all([
			(async () => {
				await rm(path, { recursive: true, force: true });
				await mkdir(dirname(path), { recursive: true });
			})(),
			await mkdir(target, { recursive: true }),
		]);
		await symlink(target, path, "dir");
	}
	try {
		await renew();
	} catch {
		await new Promise(r => setTimeout(r, 100));
		await renew();
	}
}
