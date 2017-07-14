const fs = require("fs");
const R = require('ramda');
const Maybe = require('ramda-fantasy').Maybe;

const conf = {"test": "value"};

module.exports =  function parseOptions(file) {
	
	readFileSync(file)
	.toString()
	.split("\n")
	.map(
		line => createOpt.call(null, line.split("="))
	);

	return conf;	
}

function readFileSync(file) {
	return fs.readFileSync(file, [null, "r"]);
}


function createOpt(line) {
	if (line[0] && line[1]) {
	 conf[line[0].trim()] = line[1].trim();
	}
}
