const net = require('net');
const Encoder = require('./Encoder');

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
        let command = 'ping';
        this.handleCommand(socket, command);
    }

    handleCommand(socket, command, args = []){
        switch(command) {
            case 'ping':
                socket.write(this.handlePing());    
                break;
        }
    }

    handlePing(){
        return Encoder.createSimpleString('PONG');
    }
}

module.exports = MasterServer;