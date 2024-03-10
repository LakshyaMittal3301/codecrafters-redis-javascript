class Encoder {
    static createSimpleString(string){
        return `+${string}\r\n`;
    }

    static createBulkString(string, isNull = false){
        if(!isNull){
            return `$${string.length}\r\n${string}\r\n`;
        }
        return `$-1\r\n`;
    }
}

module.exports = Encoder;