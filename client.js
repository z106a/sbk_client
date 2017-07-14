"use strict";
const path = require("path");
require("es6-promise").polyfill();
const EventLogger = require("node-windows").EventLogger;
const log = new EventLogger("SBK Live Monitoring");

const optionsBkFilePath = "/Program Files (x86)/BK/ServerBK/options.cfg";
const logFilePath = "/Program Files (x86)/BK/ServerBK/Server.log";

const getOpt = require("./functions/readConfigFile");
const getPool = require("./functions/get_pool");

const getScStatus = require("./functions/getScStatus");
const getAvailabeEvType = require("./functions/getAvEvType");
const getLastEvTypeStatus = require("./functions/getLastEvType");
const getSBkVersionFromDb = require("./functions/getSbkVersion");
const pingSomewhat = require("./functions/ping");


let socket = undefined;
let pool = undefined;
let sbkId = undefined;
let PCUrl = undefined;
let seusId = undefined;
let EvSrcAddrFlight = undefined;
let EvSrcAddrWeather = undefined;
let intervals = [];

process.on("exit", exitHandler.bind(this));
process.on("SIGINT", exitHandler.bind(this));
process.on("uncaughtException", exitHandler.bind(this));

getDbDataOnInit(getOpt(optionsBkFilePath))
	.then(() => {

		intervals.push(setInterval( getAvailabeEvType.bind(this, pool, socket, sbkId, seusId), 1000 * 60) );
		intervals.push(setInterval( getLastEvTypeStatus.bind(this, pool, socket, sbkId, seusId), 1000 * 60) );
		intervals.push(setInterval( getSBkVersionFromDb.bind(this, pool, socket, sbkId, seusId), 1000 * 60 * 60) );

		intervals.push(
			setInterval(
				getScStatus.bind(
					null,
					["Tomcat8", "MSSQLSERVER", ".ServerBK"],
					socket,
					sbkId,
					seusId
				),
				1000 * 30
			)
		);
		intervals.push(
			setInterval(
				pingSomewhat.bind(this, [
					{ ip: PCUrl, name: "PC" },
					{ ip: EvSrcAddrWeather, name: "EvSrcWeather" },
					{ ip: EvSrcAddrFlight, name: "EvSrcFlight" }
				],
				socket,
				sbkId,
				seusId),
				1000 * 10
			)
		);		
		require("./functions/readLogFile")(logFilePath, socket, sbkId, seusId);
	})
	.catch(e => console.log(e));


async function getDbDataOnInit(options) {
	try {
		pool = await getPool(options);
		sbkId = await require("./functions/getClubId")(pool);
		PCUrl = await require("./functions/getPCUrl")(pool);
		seusId = require("./functions/getSbkSeusId")(PCUrl);
		EvSrcAddrFlight = options["EventSourceAddressFlight"] || undefined;
		EvSrcAddrWeather = options["EventSourceAddressWeather"] || undefined;
		socket = require("./functions/socketConnect")(sbkId, seusId);
	} catch (e) {
		console.log(e);
	}
}





function exitHandler() {
	intervals.map(val => clearInterval(val));
	pool.close();
	process.exit();
}
