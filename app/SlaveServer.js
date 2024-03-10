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

        this.masterBuffer = '';
        this.masterSocket = null;
        this.masterOffset = 0;
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
            else if(this.handshakeStep === 4){
                if(!masterResponse.startsWith('+fullresync')) return;
                let idx = masterResponse.indexOf('\r\n');
                idx += 3;
                let sizeOfRDB = 0;
                while(masterResponse[idx] !== '\r'){
                    sizeOfRDB = (sizeOfRDB * 10) + (masterResponse[idx] - '0');
                    idx++;
                }
                idx += 2;
                let rdbFileData = masterResponse.slice(idx, idx + sizeOfRDB);
                idx += sizeOfRDB - 1;
                masterResponse = data.toString().slice(idx);
                this.masterBuffer = '';
                this.handshakeStep = 5;
            }
            if(this.handshakeStep === 5){
                if(masterResponse === '') return;
                this.masterBuffer += masterResponse;
                this.processMasterBuffer();

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
            let currentRequest = requestParser.currentRequest;
            this.handleCommand(socket, args, currentRequest);
        }

        this.clientBuffers[clientKey] = requestParser.getRemainingRequest();
    }

    processMasterBuffer(){
        const buffer = this.masterBuffer;
        let requestParser = new RequestParser(buffer);
        while(true){
            let args = requestParser.parse();
            if(args.length === 0) break;
            let currentRequest = requestParser.currentRequest;
            this.handleCommand(this.masterSocket, args, currentRequest);
            this.masterOffset += currentRequest.length;
        }
        this.masterBuffer = requestParser.getRemainingRequest();
    }

    handleCommand(socket, args, request){
        let command = args[0].toLowerCase();
        switch(command) {
            case 'info':
                socket.write(this.handleInfo(args.slice(1)));
                break;
            case 'set':
                this.handleSet(args.slice(1));
                break;
            case 'get':
                socket.write(this.handleGet(args.slice(1)));
                break;
            case 'replconf':
                socket.write(this.handleReplconf(args.slice(1)));
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

    handleSet(args){
        let key = args[0];
        let value = args[1];
        if(args.length == 2){
            this.dataStore.insert(key, value);
        } else{
            let arg = args[2];
            let expiryTime = args[3];
            this.dataStore.insertWithExpiry(key, value, expiryTime);
        }
    }

    handleGet(args){
        let key = args[0];
        let value = this.dataStore.get(key);
        if(value === null){
            return Encoder.createBulkString('', true);
        }
        return Encoder.createBulkString(value);
    }

    handleReplconf(args){
        return Encoder.createArray([
            Encoder.createBulkString('REPLCONF'),
            Encoder.createBulkString('ACK'),
            Encoder.createBulkString(`${this.masterOffset}`),
        ]);
    }

}

module.exports = SlaveServer;