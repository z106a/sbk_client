const fileTailer = require("file-tail");

module.exports = function(logFilePath, socket, sbkId, seusId) {
	const ft = fileTailer.startTailing(logFilePath);
	let log_arr = [];
	let err_arr = [];
	ft.on("line", line => {
		let split = line.split("|");
		log_arr.push({ level: split[1], text: line });

		if (split[1] === "Error") {
			err_arr.push(line);
		}
	});

	setInterval(() => {
			socket.emit("sbk log", [`${sbkId}_${seusId}`, log_arr]);
			socket.emit("sbk log err", [
				`sbk_data.sbkId, sbk_data.seusId`,
				err_arr
			]);
			log_arr.length = 0;
			err_arr.length = 0;
		}, 2000);
};
