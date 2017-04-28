const os = require('os');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
Tail = require('tail').Tail;

const logFile = '/Program\ Files\ (x86)/BK/ServerBK/Server.log';
const log = console.log.bind(console);

let buf = new Buffer(65535);
buf.fill(0);

fs.open(logFile, 'r', (err, fd) => { 
	// err && console.log(err);
	read(fd, 0);
})

function read(fd, start_from){
	fs.read(fd, buf, 0, buf.length, start_from, readFromFile);
	fs.close(fd);
}

function readFromFile(err, bytesRead, buf){
	console.log(buf.toString());
}

function logWatcher() {

	fs.createReadStream(logFile, {start: 1024*1024, autoclose: true, flags: 'r'})
	.on('data', (data) => log(data.length));
}


// fs.watchFile(logFile, (curr, prev) => log(curr, prev));

// stream.on('data', (data) => log(stream.bytesRead));

// setInterval(logWatcher.bind(), 1000);

// fs.open(logFile, 'r', function(err, fd){

// })
// tail = new Tail(logFile);
// tail.on("line", (data)=>log(data) );

// readStream.on("data", function(chunk){
//      console.log('chunk len in ts: '+chunk.length);
//      zlib.deflate(chunk, (err, buffer) => {
//          if (!err) {
//              console.log(buffer.toString('base64').length); 
//          }
//      });
// });