const sql = require("mssql");

module.exports = function(options) {
	config = {
		user: options["Database-Login"],
		password: options["Database-Password"],
		server: "127.0.0.1",
		database: options["Database-Name"]
	};

	return sql.connect(config);
}