const assert = require('assert');

class RequestParser {

    static PartialRequestError = class PartialRequestError extends Error {
        constructor() {
            super('Index out of bound while parsing request');
            this.name = 'Partial Request';
        }
    };

    constructor(buffer){
        this.request = buffer;
        this.cursor = 0;
        this.currentRequest = '';
    }

    parse(){
        let startCursor = this.cursor;
        this.args = [];
        try{
            assert.equal(this.curr(), '*', `Start of request should be *`);
            this.cursor++;
            let numOfArgs = this.readNum();
            for(let i = 0; i < numOfArgs; i++){
                this.args.push(this.readBulkString());
            }
        } 
        catch(err){
            this.cursor = startCursor;
            this.args = [];
            this.currentRequest = '';
        } 
        finally {
            this.currentRequest = this.request.slice(startCursor, this.cursor);
            return this.args;
        }

    }

    readNum(){
        let num = 0;
        while(this.curr() !== '\r'){
            num = (num * 10) + (this.curr() - '0');
            this.cursor++;
        }
        this.cursor += 2;
        return num;
    }

    readBulkString(){
        assert.equal(this.curr(), '$', 'Start of bulk string should be $');
        this.cursor++;
        let lenOfString = this.readNum();
        let string = this.getString(lenOfString);
        return string;
    }

    getString(lenOfString){
        if(this.request.length < this.cursor + lenOfString){
            throw new RequestParser.PartialRequestError();
        }
        let ret = this.request.slice(this.cursor, this.cursor + lenOfString);
        this.cursor += lenOfString + 2;
        return ret;

    }

    getRemainingRequest(){
        return this.request.slice(this.cursor);
    }

    curr(){
        if(this.cursor < 0 || this.cursor >= this.request.length){
            throw new RequestParser.PartialRequestError();
        }
        return this.request[this.cursor];
    }
}

module.exports = RequestParser;