const socket = require("socket.io-client")("http://192.168.50.15:3000");
const execWinServiceCmd = require("./execWinServiceCmd");

module.exports = function(sbkId, seusId) {
	socket.on("connect", function() {
			socket.emit("clubRegister", [sbkId, seusId]);
	});
	
	socket.on("exec_service_cmd", data => {
			if (
				+sbk_data.sbkId === +data.sbk_id &&
				+sbk_data.seusId === +data.seus_id
			) {
				execWinServiceCmd(data.name, data.cmd); // start or stop
			}
		});

	return socket;
}