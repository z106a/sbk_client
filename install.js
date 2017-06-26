var Service = require("node-windows").Service;
//process = require('process');

var args = process.argv.slice(2);
var svc = new Service({
	name: "SBK Live Monitoring",
	script: require("path").join(__dirname, "client.js")
});

svc.on('install', function() {
	svc.start();
})

svc.on("uninstall", function() {
	console.log("Uninstall complete.");
	console.log("The Service exists: ", svc.exists);
});

switch (args[0]) {
	case "install":
		svc.install();
		break;
	case "uninstall":
		svc.uninstall();
	default:
		console.log(`Usage: ${process.argv[1]} install/uninstall`);
		break;
}
