const cote = require('cote');
const fileTailer = require('file-tail');
const path = require('path');
const fs = require('fs');
const fetch = require('isomorphic-fetch');
const axios = require('axios');
const sql = require('mssql');
const exec = require('child_process').exec;
require('es6-promise').polyfill();

const publisher = new cote.Publisher({name: 'sbk publisher'});
const optionsBkFilePath = '/Program\ Files\ (x86)/BK/ServerBK/options.cfg';
const logFilePath = '/Program\ Files\ (x86)/BK/ServerBK/Server.log';

const BACKEND_BASE_URL = 'http://192.168.50.15:3000/api/';
const HALLS_URL = 'Sbks';
const EvTYPE_URL = 'EvTypes';
const NetworkTests_URL = 'NetworkTests';

const log = console.log.bind(console);

const options = {};

const sbk_data = {
		sbkId: '',
		enabled_events_type: '',
		lastEvTypeStatus: '',
		ping_result: {},
		err: []
	}

function getOptions() {
	try {
		optionFile = fs.readFileSync(optionsBkFilePath, [null, 'r']);
		optionFile.toString().split("\n")
			.map((line) => {
				let parsed_line = line.split("=");
				if (parsed_line[0] && parsed_line[1]) {
					options[parsed_line[0].trim()] = parsed_line[1].trim();
				}
			});
	} catch(e) { sbk_data.err = e; }
}

function getCLubID(pool) {
	return pool.query`select PropValue from dbo.CLUB where PropName = 'CLB_ID_GLOBAL'`
	.then(result => result.recordset[0].PropValue || undefined)
	.catch(err => sbk_data.err.push(err) );
}

function getPCUrl(pool) {
	ip_match_re = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
	return pool.query`select PropValue from dbo.CLUB where PropName = 'PROCESSING_CENTER_API_URL'`
	.then(res => res.recordset[0].PropValue.match(ip_match_re)[0] || undefined)
	.catch(err => sbk_data.err.push(err));
}

async function getDbDataOnInit() {
	config = {user: options["Database-Login"], password: options["Database-Password"],
			server: "127.0.0.1", database: options["Database-Name"]};
	try {
		let pool = await sql.connect(config);
		let clubId = await getCLubID(pool);
		await getAvailabeEvType(pool);
		await getLastEvTypeStatus(pool);
		let PCUrl = await getPCUrl(pool);

		return {
			pool: pool, clubId: clubId, PCUrl: PCUrl,
			EvSrcAddrFlight: options["EventSourceAddressFlight"],
			EvSrcAddrWeather: options["EventSourceAddressWeather"]
		};
	} catch (e) {
		sbk_data.err.push(err);
	}
}

async function init() {
	try {
		getOptions(); // sync function
		const data = await getDbDataOnInit();
		return data;
	} catch (e) {
		sbk_data.err.push(err);
	}
}

//--------------------------------

setInterval(function(){publisher.publish('sbk data', sbk_data)}, 5000);

init().then(async (init_data) => {
	sbk_data.sbkId = init_data.clubId;
	setTimeout(getAvailabeEvType.bind(this, init_data.pool), 1000 * 60 * 60); // 1 hour
	setTimeout(getLastEvTypeStatus.bind(this, init_data.pool), 1000 * 60 * 5); // 5 min
	init_data.PCUrl && interval(init_data.PCUrl, 'PC', 30000);
	init_data.EvSrcAddrWeather && interval(init_data.EvSrcAddrWeather, 'EvSrcWeather', 30000);
	init_data.EvSrcAddrFlight && interval(init_data.EvSrcAddrFlight, 'EvSrcFlight', 30000);

		// 
		ft = fileTailer.startTailing(logFilePath);
		ft.on('line', (line) => {
			publisher.publish('sbk log', line);
			// let split = line.split('|');
			// await postSbkLog(model.id, {'text': line, 'level': split[1]})

		} );
	// }
	init_data.pool.close();
});
//--------------------------------
function getAvailabeEvType(pool) {
	return pool.query`select NAME from dbo.EVENT_TYPE where AVAILABLE = '1'`
	.then(res => sbk_data.enabled_events_type = res.recordset)
	.catch(err => sbk_data.err.push(err));
}

function interval(ip, name, tick){
	return setInterval(pingSomewhat.bind(this, ip, name), tick)
}

function pingSomewhat(ip, name) {
	exec(`chcp 65001 |ping ${ip}`, (error, stdout, stderr) => {
		sbk_data.ping_result[name] = {
			ip:  ip.replace(/\./g, '_'),
			result: stdout.replace(/[\n\r]+/g, '\n') || stderr.replace(/[\n\r]+/g, '\n') || error.replace(/[\n\r]+/g, '\n'),
			dt: new Date().toString()
		};	
	});
}

function getLastEvTypeStatus(pool) {
	return pool.query`select top 1 l.STLOG_ID, t.NAME, s.ST_NAME, l.STLOG_DATE, l.REMOVED
		from EVSRC_STATE_LOG l
			inner join EVENT_TYPE t on l.EVT_TYPE = t.ID
			inner join EVSRC_STATE s on l.STLOG_STATE = s.ST_ID
		order by STLOG_DATE desc`.then(res => sbk_data.lastEvTypeStatus = res.recordset[0])
		.catch(err => sbk_data.err.push(err));
}

