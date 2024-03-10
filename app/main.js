const MasterServer = require("./MasterServer");

const HOST = 'localhost';
const PORT = '6379';

(function init(args){
    if(args.length === 0){
        let server = new MasterServer(HOST, PORT);
        server.startServer();
    } else{
        let portFlag = args[0];
        let port = args[1];
        let server = new MasterServer(HOST, port);
        server.startServer();
    }
})(process.argv.slice(2))
