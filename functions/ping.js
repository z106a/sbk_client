const exec = require("child_process").exec;

module.exports = function (servers, socket, sbkId, seusId) {
	servers.map(server => {
		try {
		exec(`chcp 65001 |ping ${server.ip}`, (error, stdout, stderr) => {
			socket.emit("network test", [
				`${sbkId}_${seusId}`,
				{
					name: server.name,
					ip: server.ip.replace(/\./g, "_"),
					result:
						stdout.replace(/[\n\r]+/g, "\n") ||
							stderr.replace(/[\n\r]+/g, "\n") ||
							error.replace(/[\n\r]+/g, "\n"),
					dt: new Date().toString()
				}
			]);
		});
		} catch(e) { console.log(e); }
	});
}