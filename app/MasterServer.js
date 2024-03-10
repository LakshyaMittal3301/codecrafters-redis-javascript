const net = require('net');
const Encoder = require('./Encoder');
const RequestParser = require('./RequestParser');

function getUid(socket){
    return socket.remoteAddress + ':' + socket.remotePort;
}

class MasterServer {
    constructor(host, port){
        this.host = host;
        this.port = port;
        this.clientBuffers = {};
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
        }
    }

    handlePing(){
        return Encoder.createSimpleString('PONG');
    }

    handleEcho(args){
        return Encoder.createBulkString(args[0]);
    }
}

module.exports = MasterServer;