module.exports = function(pool) {
	ip_match_re = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
	return pool.query`select PropValue from dbo.CLUB where PropName = 'PROCESSING_CENTER_API_URL'`
		.then(
			res => res.recordset[0].PropValue.match(ip_match_re)[0] || undefined
		)
		.catch(err => {
			sbk_data.err.push(err);
			log.error(err);
		});
}