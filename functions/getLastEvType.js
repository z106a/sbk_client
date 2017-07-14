module.exports = function (pool, socket, sbkId, seusId) {
	return pool.query`select TOP 5 l.STLOG_ID, t.NAME, s.ST_NAME, l.STLOG_DATE, l.REMOVED
		from EVSRC_STATE_LOG l
			inner join EVENT_TYPE t on l.EVT_TYPE = t.ID
			inner join EVSRC_STATE s on l.STLOG_STATE = s.ST_ID
		order by STLOG_DATE desc`
		.then(res => {
			socket.emit("EvTypeStatus", [
				sbkId,
				seusId,
				{ evTypeStatus: res.recordset }
			]);
		})
		.catch(err => {
			console.log(err)
		});
}