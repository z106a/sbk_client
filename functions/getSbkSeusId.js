
module.exports = function(ip) {
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