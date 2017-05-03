const fileTailer = require('file-tail');
const path = require('path');
const fs = require('fs');
const fetch = require('isomorphic-fetch');
const sql = require('mssql');
require('es6-promise').polyfill();

const optionsBkFilePath = '/Program\ Files\ (x86)/BK/ServerBK/options.cfg';
const logFilePath = '/Program\ Files\ (x86)/BK/ServerBK/Server.log';

const BACKEND_BASE_URL = 'http://192.168.50.15:3000/api/';
const HALLS = 'Sbks';

const log = console.log.bind(console);

const options = {};

function getHalls() {
	return fetch(BACKEND_BASE_URL+HALLS).then((resp) => resp.json()).catch(err => log(err));
}

function getOptions() {
	optionFile = fs.readFileSync(optionsBkFilePath, [null, 'r']);
	optionFile.toString().split("\n")
		.map((line) => {
			let parsed_line = line.split("=");
			if (parsed_line[0] && parsed_line[1]) {
				options[parsed_line[0].trim()] = parsed_line[1].trim();
			}
		});
}

function getClubId(dbconfig) {
	return sql.connect(dbconfig).then(() => 
		sql.query`select PropValue from dbo.CLUB where PropName = 'CLB_ID_GLOBAL'`
		).then(result => {
			sql.close();
			return result.recordset[0].PropValue || undefined;
		}).catch(err => {
			log(err);
			sql.close();
		});
}

function init() {
	let halls = getHalls();
	halls.then((val) => log(val[0]));
	getOptions();
	getClubId({user: options["Database-Login"], password: options["Database-Password"],
		server: "127.0.0.1", database: options["Database-Name"]})
		.then(val => log(val));	
}

init();

log('after init');
// const dbconfig = {
// 	user: options["Database-Login"],
// 	password: options["Database-Password"],
// 	server: "127.0.0.1",
// 	database: options["Database-Name"]
// }

// const res = sql.connect(dbconfig).then(() => {
// 	return sql.query`select PropValue from dbo.CLUB where PropName = 'CLB_ID_GLOBAL'`;
// }).then(result => {
// 	sql.close();
// 	return result.recordset[0].PropValue || undefined;
// }).catch(err => {
// 	log(err);
// 	sql.close();
// });

// res.then((s) => log(s));
// sql.on('error', err => log(err));

// ft = fileTailer.startTailing(logFilePath);
// ft.on('line', (line) => log(line));
