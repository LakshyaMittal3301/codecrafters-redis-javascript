const HashTable = require('./HashTable');

class RDBParser{

    static CONSTANTS = {
        MAGIC_REDIS_STRING: 5,
        RDB_VERSION: 4
    };

    static OPCodes = {
        AUX: 0xFA,
        RESIZEDB: 0xFB,
        EXPIRETIMEMS: 0xFC,
        EXPIRETIME: 0xFD,
        SELECTDB: 0xFE,
        EOF: 0xFF
    }

    constructor(buffer){
        this.buffer = buffer;
        this.cursor = 0;
        this.dataStore = new HashTable();

        this.auxData = {};
    }

    parse(){
        let redisMagicString = this.readStringOfLen(RDBParser.CONSTANTS.MAGIC_REDIS_STRING);
        let rdbVersion = this.readStringOfLen(RDBParser.CONSTANTS.RDB_VERSION);

        while(true){
            const opCode = this.readByte();
            switch(opCode){
                case RDBParser.OPCodes.AUX:
                    this.readAUX();
                    break;
                    
                case RDBParser.OPCodes.RESIZEDB:
                    this.readResizeDB();
                    break;
                    
                case RDBParser.OPCodes.EXPIRETIMEMS:
                    this.readExpireTimeMS();
                    break;
                    
                case RDBParser.OPCodes.EXPIRETIME:
                    this.readExpireTime();
                    break;
                    
                case RDBParser.OPCodes.SELECTDB:
                    this.readSelectDB();
                    break;
                    
                case RDBParser.OPCodes.EOF:
                    this.readEOF();
                    return;
                default:
                    this.readKeyWithoutExpiry(opCode);
                    break;
            }
        }

    }

    readAUX(){
        let key = this.readStringEncoding();
        let value = this.readStringEncoding();
        this.auxData[key] = value;
    }

    readResizeDB(){
        let hashTableSize = this.readLengthEncoding().value;
        let expireHashTableSize = this.readLengthEncoding().value;
    }
    
    readExpireTimeMS(){
        let timestamp = this.read8Bytes();
        let valueType = this.readValueType();
        let key = this.readStringEncoding();
        let value = this.readValue(valueType);

        this.dataStore.insertKeyWithTimeStamp(key, value, timestamp);
    }

    readExpireTime(){
        let timestamp = this.read4Bytes() * 1000;
        let valueType = this.readValueType();
        let key = this.readStringEncoding();
        let value = this.readValue(valueType);

        this.dataStore.insertKeyWithTimeStamp(key, value, timestamp);

    }

    readSelectDB(){
        let { type, value } = this.readLengthEncoding();
    }

    readEOF(){
    }

    readKeyWithoutExpiry(valueType){
        let key = this.readStringEncoding();
        let value = this.readValue(valueType);
        this.dataStore.insert(key, value);
    }

    readStringEncoding(){
        let {type, value} = this.readLengthEncoding();
        
        if(type === 'length'){
            let length = value;
            return this.readStringOfLen(length);
        }

        if(value === 0){
            return `${this.readByte()}`;
        }
        else if(value === 1){
            return `${this.read2Bytes()}`;
        }
        else if(value === 2){
            return `${this.read4Bytes()}`;
        }
        
        throw new Error('Error while reading string encoding');
    }

    readLengthEncoding(){
        let firstByte = this.readByte();
        let twoBits = firstByte >> 6;

        let value = 0;
        let type = 'length';
        if(twoBits === 0b00){
            value = firstByte & 0b00111111;
        } 
        else if(twoBits === 0b01){
            let secondByte = this.readByte();
            value = ((firstByte & 0b00111111) << 8) | (secondByte);
        } 
        else if(twoBits === 0b10){
            value = this.read4Bytes();
        }
        else if(twoBits === 0b11){
            type = 'format';
            value = firstByte & 0b00111111;
        }
        else{
            throw new Error(`Error while reading length encoding, got first byte as : ${firstByte}`);
        }
        return {type, value};
    }

    readValueType(){
        return this.readByte();
    }

    readValue(valueType){
        if(valueType == 0){
            return this.readStringEncoding();
        }
        throw new Error(`Value Type not handled: ${valueType}`);
    }

    readByte(){
        return this.buffer[this.cursor++];
    }

    read2Bytes(){
        let bytes = this.buffer.readUInt16LE(this.cursor);
        this.cursor += 2;
        return bytes;
    }

    read4Bytes(){
        let bytes = this.buffer.readUInt32LE(this.cursor);
        this.cursor += 4;
        return bytes;
    }

    read8Bytes(){
        let bytes = this.buffer.readBigUint64LE(this.cursor);
        this.cursor += 8;
        return bytes;
    }

    readStringOfLen(len){
        let string = String.fromCharCode(...(this.buffer.subarray(this.cursor, this.cursor + len)));
        this.cursor += len;
        return string;
    }
}

module.exports = RDBParser;