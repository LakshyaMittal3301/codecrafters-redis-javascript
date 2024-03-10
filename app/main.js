const MasterServer = require("./MasterServer");

const HOST = 'localhost';
const PORT = '6379';

(function init(){
    let server = new MasterServer(HOST, PORT);
    server.startServer();
})()
