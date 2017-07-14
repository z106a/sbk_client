module.exports = function(pool) {
	return pool.query`select PropValue from dbo.CLUB where PropName = 'CLB_ID_GLOBAL'`
		.then(result => result.recordset[0].PropValue || undefined)
		.catch(err => {
			sbk_data.err.push(err);
			log.error(err);
		});
}