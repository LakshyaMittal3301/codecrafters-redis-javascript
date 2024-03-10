const net = require('net');
const Encoder = require('./Encoder');
const RequestParser = require('./RequestParser');
const HashTable = require('./HashTable');

function getUid(socket){
    return socket.remoteAddress + ':' + socket.remotePort;
}

class SlaveServer {
    constructor(host, port, masterHost, masterPort){
        this.host = host;
        this.port = port;
        this.masterHost = masterHost;
        this.masterPort = masterPort;
        this.dataStore = new HashTable();
        this.clientBuffers = {};
    }

    startServer(){
        this.performHandshake();
        const server = net.createServer((socket) => {
            this.clientBuffers[getUid(socket)] = '';

            socket.on(`data`, (data) => {
                this.clientBuffers[getUid(socket)] += data.toString();
                this.processClientBuffer(socket);
            });

            socket.on('error', (err) => {
                console.log(`Socket Error: ${err}`);
                delete this.clientBuffers[getUid(socket)];
            });

            socket.on(`close`, () => {
                console.log(`Disconnecting client: ${getUid(socket)}`);
                delete this.clientBuffers[getUid(socket)];
            })
        });


        server.listen(this.port, this.host, () => {
            console.log(`Server Listening on ${this.host}:${this.port}`);
        });
    }

    performHandshake(){
        const socket = net.createConnection({host: this.masterHost, port: this.masterPort}, () => {
            console.log(`Connected to master server on ${this.masterHost}:${this.masterPort}`);
        });
        
        this.masterSocket = socket;
        
        socket.write(Encoder.createArray([
            Encoder.createBulkString('PING')
        ]));
        this.handshakeStep = 1;

        socket.on('data', (data) => {
            let masterResponse = data.toString().toLowerCase();
            if(this.handshakeStep === 1){
                if(masterResponse !== Encoder.createSimpleString('pong')) return;
                this.handshakeStep = 2;
                socket.write(Encoder.createArray([
                    Encoder.createBulkString('REPLCONF'),
                    Encoder.createBulkString('listening-port'),
                    Encoder.createBulkString(`${this.port}`)
                ]));
            } 
            else if(this.handshakeStep === 2){
                if(masterResponse !== Encoder.createSimpleString('ok')) return;
                this.handshakeStep = 3;
                socket.write(Encoder.createArray([
                    Encoder.createBulkString('REPLCONF'),
                    Encoder.createBulkString('capa'),
                    Encoder.createBulkString('psync2')
                ]));
            } 
            else if(this.handshakeStep === 3){
                if(masterResponse !== Encoder.createSimpleString('ok')) return;
                this.handshakeStep = 4;
                socket.write(Encoder.createArray([
                    Encoder.createBulkString('PSYNC'),
                    Encoder.createBulkString('?'),
                    Encoder.createBulkString('-1')
                ]));
            }
        });

        socket.on(`error`, (err) => {
            console.log(`Error from master server connection : ${err}`);
        });

        socket.on('close', () => {
            console.log('Connection closed');
        });

    }

    processClientBuffer(socket){
        const clientKey = getUid(socket);
        const buffer = this.clientBuffers[clientKey];
        let requestParser = new RequestParser(buffer);
        while(true){
            let args = requestParser.parse();
            if(args.length === 0) break;
            this.handleCommand(socket, args);
        }

        this.clientBuffers[clientKey] = requestParser.getRemainingRequest();
    }

    handleCommand(socket, args){
        let command = args[0].toLowerCase();
        switch(command) {
            case 'info':
                socket.write(this.handleInfo(args.slice(1)));
                break;
        }
    }

    handleInfo(args){
        let section = args[0].toLowerCase();
        let response;
        if(section === 'replication'){
            response = Encoder.createBulkString('role:slave');
        }
        return response;
    }

}

module.exports = SlaveServer;