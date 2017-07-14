module.exports = function (pool, socket, sbkId, seusId) {
	return pool.query`select NAME from dbo.EVENT_TYPE where AVAILABLE = '1'`
		.then(res =>
			socket.emit("AvailableEvTypes", [
				`${sbkId}_${seusId}`,
				res.recordset
			])
		)
		.catch(err => {
			console.log(err);
		});
};