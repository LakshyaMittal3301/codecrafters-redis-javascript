const net = require("net");
const HOST = 'localhost';
const PORT = '6379';

(function init(){
    const server = net.createServer((socket) => {
      // Handle connection
    });
    
    server.listen(PORT, HOST, () => {
        console.log(`Server Listening on ${HOST}:${PORT}`);
    });

})()
