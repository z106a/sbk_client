const ts = require('tail-stream');
const fileTailer = require('file-tail');

const logFile = '/Program\ Files\ (x86)/BK/ServerBK/Server.log';
const log = console.log.bind(console);

ft = fileTailer.startTailing(logFile);
ft.on('line', (line) => log(line));
// const tsStream = ts.createReadStream(logFile, {
// 	beginAt: 0,
// 	onMove: 'stay',
// 	detectTruncate: true,
// 	onTruncate: 'end',
// 	endOnError: true,
// 	useWatch: false
// });

// tsStream.on('data', (data) => log(data));

// tsStream.on('eof', () => log('eof'));

// tsStream.on('end', () => log('ended'));
// tsStream.on('error', (err) => log(err));