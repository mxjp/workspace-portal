
/**
 * @param {string} relPath
 */
export function getPackageName(relPath) {
	const parts = relPath.split("/");
	const root = parts.lastIndexOf("node_modules");
	return parts.slice(root + 1).join("/");
}
