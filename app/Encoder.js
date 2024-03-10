class Encoder {
    static createSimpleString(string){
        return `+${string}\r\n`;
    }

    static createBulkString(string, isNull = false){
        return `$${string.length}\r\n${string}\r\n`;
    }
}

module.exports = Encoder;