const exec = require("child_process").exec;

module.export = function (name, cmd) {
	exec(`chcp 65001 |sc cmd ${name}`, (error, stdout, stderr) => {
		error && console.log(error);
	});
}