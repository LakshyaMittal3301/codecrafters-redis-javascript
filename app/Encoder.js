class Encoder {
    static createSimpleString(string){
        return `+${string}\r\n`;
    }
}

module.exports = Encoder;