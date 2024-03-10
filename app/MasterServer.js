const net = require('net');
const Encoder = require('./Encoder');
const RequestParser = require('./RequestParser');
const HashTable = require('./HashTable');

function getUid(socket){
    return socket.remoteAddress + ':' + socket.remotePort;
}

class MasterServer {
    constructor(host, port){
        this.host = host;
        this.port = port;
        this.dataStore = new HashTable();
        this.clientBuffers = {};

        this.masterReplId = '8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb';
        this.masterReplOffset = 0;
    }

    startServer(){
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
            case 'ping':
                socket.write(this.handlePing());    
                break;
            case 'echo':
                socket.write(this.handleEcho(args.slice(1)));
                break;
            case 'set':
                socket.write(this.handleSet(args.slice(1)));
                break;
            case 'get':
                socket.write(this.handleGet(args.slice(1)));
                break;
            case 'info':
                socket.write(this.handleInfo(args.slice(1)));
                break;
            case 'replconf':
                socket.write(this.handleReplconf(args.slice(1)));
                break;
            case 'psync':
                socket.write(this.handlePsync(args.slice(1)));
                break;
        }
    }

    handlePing(){
        return Encoder.createSimpleString('PONG');
    }

    handleEcho(args){
        return Encoder.createBulkString(args[0]);
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
        return Encoder.createSimpleString('OK');
    }

    handleGet(args){
        let key = args[0];
        let value = this.dataStore.get(key);
        if(value === null){
            return Encoder.createBulkString('', true);
        }
        return Encoder.createBulkString(value);
    }

    handleInfo(args){
        let section = args[0].toLowerCase();
        let response = '';
        if(section === 'replication'){
            response = 'role:master\n';
            response += `master_replid:${this.masterReplId}\n`;
            response += `master_repl_offset:${this.masterReplOffset}`;
        }
        return Encoder.createBulkString(response);
    }

    handleReplconf(args){
        return Encoder.createSimpleString('OK');
    }

    handlePsync(args){
        return Encoder.createSimpleString(`FULLRESYNC ${this.masterReplId} ${this.masterReplOffset}`);
    }

}

module.exports = MasterServer;