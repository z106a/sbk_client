const exec = require("child_process").exec;

module.exports = function (services, socket, sbkId, seusId) {
	services.map(service => {
		exec(`chcp 65001 |sc query ${service}`, (error, stdout, stderr) => {
			try {
				const first_part = stdout.match(/state.*/gi);
				if (first_part && first_part.length > 0) {
					const log = first_part[0].split(":")[1].match(/\w+/gi)[1];
					socket.emit("win services", [
						`${sbkId}_${seusId}`,
						{
							serviceName: service,
							log: log
						}
					]);
				}
			} catch (e) {
				console.log(e);
			}
		});
	});
}