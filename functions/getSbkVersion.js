module.exports = function (pool, socket, sbkId, seusId) {
	return pool.query`select TOP 1 DBV_VERSION from dbo.DBVERSION ORDER BY DBV_ID DESC`
		.then(res => {
			socket.emit("sbk_version", [
				sbkId,
				seusId,
				res.recordset[0]
			]);
		})
		.catch(err => {
			console.log(err);
		});
}