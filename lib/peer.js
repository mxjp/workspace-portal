import { Socket, connect, createServer } from "node:net";
import { createInterface } from "node:readline";

/**
 * @template T
 * @param {object} options
 * @param {number} options.port
 * @param {T} options.info
 * @param {(info: T) => void} options.onInfo
 */
export function createPeer(options) {
	function runServer() {
		const clients = new Map();
		const server = createServer(socket => {
			socket.on("error", () => socket.destroy());
			socket.on("close", () => clients.delete(socket));
			recv(socket, info => {
				options.onInfo(info);
				clients.set(socket, info);
				for (const client of clients.keys()) {
					if (client !== socket) {
						send(client, info);
					}
				}
			});
			send(socket, options.info);
			for (const [client, info] of clients) {
				if (client !== socket) {
					send(socket, info);
				}
			}
		});
		server.on("error", () => server.close());
		server.on("close", runClient);
		server.listen(options.port, "::1");
	}

	function runClient() {
		const socket = connect(options.port, "::1", () => {
			recv(socket, options.onInfo);
			send(socket, options.info);
		});
		socket.on("error", () => socket.destroy());
		socket.on("close", runServer);
	}

	/**
	 *
	 * @param {Socket} socket
	 * @param {(info: T) => void} onInfo
	 */
	function recv(socket, onInfo) {
		const rl = createInterface(socket);
		rl.on("error", () => {});
		rl.on("line", line => {
			onInfo(JSON.parse(line));
		});
	}

	/**
	 * @param {Socket} socket
	 * @param {T} info
	 */
	function send(socket, info) {
		socket.write(JSON.stringify(info) + "\n");
	}

	runServer();
}
