const cote = require("cote");
const fileTailer = require("file-tail");
const path = require("path");
const fs = require("fs");
const sql = require("mssql");
const exec = require("child_process").exec;
require("es6-promise").polyfill();
const EventLogger = require('node-windows').EventLogger;

const log = new EventLogger('SBK Live Monitoring');

const publisher = new cote.Publisher({ name: "sbk publisher" });
const optionsBkFilePath = "/Program Files (x86)/BK/ServerBK/options.cfg";
const logFilePath = "/Program Files (x86)/BK/ServerBK/Server.log";

const BACKEND_BASE_URL = "http://192.168.50.15:3000/api/";
const HALLS_URL = "Sbks";
const EvTYPE_URL = "EvTypes";
const NetworkTests_URL = "NetworkTests";

//const log = console.log.bind(console);

const options = {};

const sbk_data = {
	sbkId: "",
	id_seus: "",
	enabled_events_type: "",
	lastEvTypeStatus: "",
	ping_result: {},
	err: []
};

function getOptions() {
	try {
		optionFile = fs.readFileSync(optionsBkFilePath, [null, "r"]);
		optionFile.toString().split("\n").map(line => {
			let parsed_line = line.split("=");
			if (parsed_line[0] && parsed_line[1]) {
				options[parsed_line[0].trim()] = parsed_line[1].trim();
			}
		});
	} catch (e) {
		sbk_data.err = e;
		log.error(e);
	}
}

function getCLubID(pool) {
	return pool.query`select PropValue from dbo.CLUB where PropName = 'CLB_ID_GLOBAL'`
		.then(result => result.recordset[0].PropValue || undefined)
		.catch(err => {sbk_data.err.push(err); log.error(err);});
}

function getPCUrl(pool) {
	ip_match_re = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
	return pool.query`select PropValue from dbo.CLUB where PropName = 'PROCESSING_CENTER_API_URL'`
		.then(
			res => res.recordset[0].PropValue.match(ip_match_re)[0] || undefined
		)
		.catch(err => {sbk_data.err.push(err);log.error(err);});
}

function getSbkSeusId(ip) {
	switch (ip.split(".")[3]) {
		case "11":
			return 4;
		case "21":
			return 5;
		case "31":
			return 6;
		case "41":
			return 7;
		case "51":
			return 8;
	}
}

async function getDbDataOnInit() {
	config = {
		user: options["Database-Login"],
		password: options["Database-Password"],
		server: "127.0.0.1",
		database: options["Database-Name"]
	};
	try {
		let pool = await sql.connect(config);
		let clubId = await getCLubID(pool);
		let PCUrl = await getPCUrl(pool);
		let id_seus = getSbkSeusId(PCUrl);

		return {
			pool: pool,
			clubId: clubId,
			seusId: id_seus,
			PCUrl: PCUrl,
			EvSrcAddrFlight: options["EventSourceAddressFlight"],
			EvSrcAddrWeather: options["EventSourceAddressWeather"]
		};
	} catch (e) {
		sbk_data.err.push(err);
		log.error(e);
	}
}

async function init() {
	try {
		getOptions(); // sync function
		const data = await getDbDataOnInit();
		return data;
	} catch (e) {
		log.error(e);
		sbk_data.err.push(err);
	}
}

//--------------------------------

// setInterval(function(){publisher.publish('sbk data', sbk_data)}, 5000);

init().then(init_data => {
	sbk_data.sbkId = init_data.clubId;
	sbk_data.seusId = init_data.seusId;
	
	setTimeout(getSBkVersionFromDb.bind(this, init_data.pool), 3000); // wait for cote publisher 
	setTimeout(getAvailabeEvType.bind(this, init_data.pool), 3100);
	setTimeout(getLastEvTypeStatus.bind(this, init_data.pool), 3200);

	setInterval(getAvailabeEvType.bind(this, init_data.pool), 1000 * 60 * 1); // 1 min
	setInterval(getLastEvTypeStatus.bind(this, init_data.pool), 1000 * 60 * 1); // 1 min
	setInterval(getSBkVersionFromDb.bind(this, init_data.pool), 1000 * 60 * 60 * 24); // once a day
	
	init_data.PCUrl && interval(init_data.PCUrl, "PC", 30000);
	init_data.EvSrcAddrWeather &&
		interval(init_data.EvSrcAddrWeather, "EvSrcWeather", 30000);
	init_data.EvSrcAddrFlight &&
		interval(init_data.EvSrcAddrFlight, "EvSrcFlight", 30000);

	//
	ft = fileTailer.startTailing(logFilePath);
	let log_arr = [];
	ft.on("line", line => {
		let split = line.split("|");

		log_arr.push({ level: split[1], text: line });
		if (log_arr.length === 500) {
			publisher.publish("sbk log", [
				`${sbk_data.sbkId}_${sbk_data.seusId}`,
				log_arr
			]);
			log_arr.length = 0;
		}

		if (split[1] === "Error") {
			publisher.publish("sbk log err", [
				sbk_data.sbkId,
				sbk_data.seusId,
				line
			]);
		}
	});
	// }
	// init_data.pool.close();
});
//--------------------------------
function getAvailabeEvType(pool) {
	return pool.query`select NAME from dbo.EVENT_TYPE where AVAILABLE = '1'`
		.then(res =>
			publisher.publish("AvailableEvTypes", [
				`${sbk_data.sbkId}_${sbk_data.seusId}`,
				res.recordset
			])
		)
		.catch(err => {
			log.error(err);
			sbk_data.err.push(err);
		});
}

function getSBkVersionFromDb(pool) {
	return pool.query`select TOP 1 DBV_VERSION from dbo.DBVERSION ORDER BY DBV_ID DESC`
		.then(res => {
			publisher.publish('sbk_version', [sbk_data.sbkId, sbk_data.seusId, res.recordset[0]])
		}
		)
		.catch(err => {
			log.error(err);
			sbk_data.err.push(err);
		});
}

function interval(ip, name, tick) {
	return setInterval(pingSomewhat.bind(this, ip, name), tick);
}

function pingSomewhat(ip, name) {
	exec(`chcp 65001 |ping ${ip}`, (error, stdout, stderr) => {
		publisher.publish("network test", [
			`${sbk_data.sbkId}_${sbk_data.seusId}`,
			{
				name: name,
				ip: ip.replace(/\./g, "_"),
				result:
					stdout.replace(/[\n\r]+/g, "\n") ||
						stderr.replace(/[\n\r]+/g, "\n") ||
						error.replace(/[\n\r]+/g, "\n"),
				dt: new Date().toString()
			}
		]);
	});
}

function getLastEvTypeStatus(pool) {
	return pool.query`select TOP 5 l.STLOG_ID, t.NAME, s.ST_NAME, l.STLOG_DATE, l.REMOVED
		from EVSRC_STATE_LOG l
			inner join EVENT_TYPE t on l.EVT_TYPE = t.ID
			inner join EVSRC_STATE s on l.STLOG_STATE = s.ST_ID
		order by STLOG_DATE desc`
		.then(res => {
			publisher.publish("EvTypeStatus", [
				sbk_data.sbkId,
				sbk_data.seusId,
				{evTypeStatus: res.recordset}
			]);
		})
		.catch(err => {
			log.error(err);
			sbk_data.err.push(err);
		});
}
