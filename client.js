const fileTailer = require('file-tail');
const path = require('path');
const fs = require('fs');
const sql = require('mssql');

const optionsBkFilePath = '/Program\ Files\ (x86)/BK/ServerBK/options.cfg';
const logFilePath = '/Program\ Files\ (x86)/BK/ServerBK/Server.log';
const log = console.log.bind(console);

const options = {};

function init() {
	optionFile = fs.readFileSync(optionsBkFilePath, [null, 'r']);
	optionFile.toString().split("\n")
		.map((line) => {
			let parsed_line = line.split("=");
			if (parsed_line[0] && parsed_line[1]) {
				options[parsed_line[0].trim()] = parsed_line[1].trim();
			}
		});
	
}

init();

const dbconfig = {
	user: options["Database-Login"],
	password: options["Database-Password"],
	server: "127.0.0.1",
	database: options["Database-Name"]
}

var res = sql.connect(dbconfig).then(() => {
	return sql.query`select PropValue from dbo.CLUB where PropName = 'CLB_ID_GLOBAL'`;
}).then(result => {
	// console.dir(result);
	sql.close();
	return result.recordset[0].PropValue || undefined;
}).catch(err => {
	log(err);
	sql.close();
});

res.then((s) => log(s));
sql.on('error', err => log(err));

// ft = fileTailer.startTailing(logFilePath);
// ft.on('line', (line) => log(line));
