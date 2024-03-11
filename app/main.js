const MasterServer = require("./MasterServer");
const SlaveServer = require("./SlaveServer");

const HOST = 'localhost';
const PORT = '6379';

(function init(args){
    if(args.length === 0){
        let server = new MasterServer(HOST, PORT);
        server.startServer();
        return;
    } 
    let flag = args[0];
    if(flag === '--port'){
        if(args.length === 2){
            let port = args[1];
            let server = new MasterServer(HOST, port);
            server.startServer();
            let portFlag = args[0];
        } else if(args.length === 5){
            let port = args[1];
            let replicaFlag = args[2];
            let masterHost = args[3];
            let masterPort = args[4];
            let server = new SlaveServer(HOST, port, masterHost, masterPort);
            server.startServer();
        }
    } else if(flag === '--dir'){
        let config = {};
        config.dir = args[1];
        config.dbfilename = args[3];
        let server = new MasterServer(HOST, PORT, config);
        server.startServer();
    }
})(process.argv.slice(2))