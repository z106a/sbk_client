const fileTailer = require('file-tail');
const path = require('path');
const fs = require('fs');
const fetch = require('isomorphic-fetch');
const axios = require('axios');
const sql = require('mssql');
const exec = require('child_process').exec;
require('es6-promise').polyfill();

const optionsBkFilePath = '/Program\ Files\ (x86)/BK/ServerBK/options.cfg';
const logFilePath = '/Program\ Files\ (x86)/BK/ServerBK/Server.log';

const BACKEND_BASE_URL = 'http://192.168.50.15:3000/api/';
const HALLS_URL = 'Sbks';
const EvTYPE_URL = 'EvTypes';
const NetworkTests_URL = 'NetworkTests';

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

function getCLubID(pool) {
	return pool.query`select PropValue from dbo.CLUB where PropName = 'CLB_ID_GLOBAL'`
	.then(result => result.recordset[0].PropValue || undefined)
	.catch(err => log(err) );
}

function getAvailabeEvType(pool) {
	return pool.query`select NAME from dbo.EVENT_TYPE where AVAILABLE = '1'`
	.then(res => res.recordset)
	.catch(err => log(err));
}

function getPCUrl(pool) {
	ip_match_re = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
	return pool.query`select PropValue from dbo.CLUB where PropName = 'PROCESSING_CENTER_API_URL'`
	.then(res => res.recordset[0].PropValue.match(ip_match_re)[0] || undefined)
	.catch(err => log(err));
}

async function getDbDataOnInit() {
	config = {user: options["Database-Login"], password: options["Database-Password"],
			server: "127.0.0.1", database: options["Database-Name"]};
	try {
		let pool = await sql.connect(config);
		let clubId = await getCLubID(pool);
		let evTypes = await getAvailabeEvType(pool);
		let PCUrl = await getPCUrl(pool);
		return {
			pool: pool, clubId: clubId, evTypes: evTypes, PCUrl: PCUrl,
			EvSrcAddrFlight: options["EventSourceAddressFlight"],
			EvSrcAddrWeather: options["EventSourceAddressWeather"]
		};
	} catch (e) {
		log(e);
	}
}

async function init() {
	try {
		// const halls = await getHalls();
		// log(halls[0]);
		getOptions(); // sync function
		const data = await getDbDataOnInit();
		return data;
	} catch (e) {
		log(e);
	}
}

//--------------------------------
let model_id = undefined;
init().then(async (init_data) => {
	let model = await findModelInDb(init_data.clubId); // here we get field 'id'
	if (model) {
		model_id = model.id // set global model_id
		await patchData(model.id, {'enabled_events_type': init_data.evTypes});
		await getLastEvTypeStatus(init_data.pool);
		init_data.PCUrl && interval(init_data.PCUrl, 30000);
		init_data.EvSrcAddrWeather && interval(init_data.EvSrcAddrWeather, 30000);
		init_data.EvSrcAddrFlight && interval(init_data.EvSrcAddrFlight, 30000);

		// 
		// ft = fileTailer.startTailing(logFilePath);
		// ft.on('line', async (line) => (await patchData(model.id, {'bk_server_log': line})) );
	}
	init_data.pool.close();
});
//--------------------------------
function interval(ip, tick){
	return setInterval(pingSomewhat.bind(this, ip), tick)
}

function pingSomewhat(ip) {
	log(String(ip));
	exec(`chcp 65001 |ping ${ip}`, (error, stdout, stderr) => {
		putNetworkTests({ip: ip.replace(/\./g, '_'),
		 result: stdout.replace(/[\n\r]+/g, '\n') || stderr.replace(/[\n\r]+/g, '\n') || error.replace(/[\n\r]+/g, '\n')});		
	});
}

function findModelInDb(id_hall) {
	return fetch(`${BACKEND_BASE_URL}${HALLS_URL}/findOne?filter[where][id_hall]=${id_hall}`)
		.then(resp => resp.json()).then(model => {
			return model.error ? undefined : model;
		}).catch(e=>log(e));
}

function patchData(id, val) {
	let header = 'Content-Type: application/json';
	log(val);
	return axios.patch(`${BACKEND_BASE_URL}${HALLS_URL}/${id}`, 
		val)
		.then(() => log('patchSuccess'))
		.catch(e => log(e));
}

function getLastEvTypeStatus(pool) {
	return pool.query`select top 1 l.STLOG_ID, t.NAME, s.ST_NAME, l.STLOG_DATE, l.REMOVED
		from EVSRC_STATE_LOG l
			inner join EVENT_TYPE t on l.EVT_TYPE = t.ID
			inner join EVSRC_STATE s on l.STLOG_STATE = s.ST_ID
		order by STLOG_DATE desc`.then(res => putEvTypeStatus(res.recordset[0]));
}

function putEvTypeStatus(data) {
	data.sbk_fk = model_id;
	axios.put(`${BACKEND_BASE_URL}${EvTYPE_URL}`, data).catch(e => log(e));
}

function putNetworkTests(data) {
	data.sbk_fk = model_id;
	axios.patch(`${BACKEND_BASE_URL}${NetworkTests_URL}`, data).catch(e => log(e));
}

