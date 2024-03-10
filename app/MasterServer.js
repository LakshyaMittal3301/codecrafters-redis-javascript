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

        this.replicas = {};
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
            let currentRequest = requestParser.currentRequest;
            this.handleCommand(socket, args, currentRequest);
        }

        this.clientBuffers[clientKey] = requestParser.getRemainingRequest();
    }

    handleCommand(socket, args, request){
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
                this.propagate(request);
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
                socket.write(this.handlePsync(args.slice(1), socket));
                this.replicas[getUid(socket)] = {socket, state: 'connected'};
                break;
            case 'wait':
                socket.write(this.handleWait(args.slice(1)));
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

    handlePsync(args, socket){
        socket.write(Encoder.createSimpleString(`FULLRESYNC ${this.masterReplId} ${this.masterReplOffset}`));
        const emptyRDB = '524544495330303131fa0972656469732d76657205372e322e30fa0a72656469732d62697473c040fa056374696d65c26d08bc65fa08757365642d6d656dc2b0c41000fa08616f662d62617365c000fff06e3bfec0ff5aa2';
        const buffer = Buffer.from(emptyRDB, 'hex');
        const finalBuffer = Buffer.concat([
            Buffer.from(`$${buffer.length}\r\n`),
            buffer
        ]);
        return finalBuffer;
    }

    propagate(request){
        for(const replica of Object.values(this.replicas)){
            const socket = replica.socket;
            socket.write(request);
        }
    }

    handleWait(args){
        if(Object.keys(this.replicas).length === 0) return Encoder.createInteger(0);
    }

}

module.exports = MasterServer;