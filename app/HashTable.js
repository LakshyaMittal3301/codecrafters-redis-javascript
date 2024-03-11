class HashTable{
    constructor(){
        this.map = new Map();
    }

    insert(key, value, type = 'string'){
        this.insertWithExpiry(key, value, 1000 * 60 * 60 * 24, type);
    }

    insertWithExpiry(key, value, expiry, type = 'string'){
        let expiryTimestamp = parseInt(expiry) + Date.now();
        this.insertKeyWithTimeStamp(key, value, expiryTimestamp, type);
    }

    insertKeyWithTimeStamp(key, value, timestamp, type = 'string'){
        if(type === 'string'){
            this.map.set(key, {value, expiry: timestamp, type});
        } else if(type === 'stream'){
            if(!this.map.has(key)) this.map.set(key, {value: [], expiry: timestamp, type});
            let existingValue = this.map.get(key);
            existingValue.value.push(value);
            this.map.set(key, existingValue); 
        } else{
            throw new Error(`Data Type not handled`);
        }
    }

    get(key){
        if(this.has(key)){
            return this.map.get(key).value;
        }
        return null;
    }

    has(key){
        if(!this.map.has(key)) return false;
        if(this.map.get(key).expiry < Date.now()){
            this.map.delete(key);
            return false;
        }
        return true;
    }

    getAllKeys(){
        return [...this.map.keys()];
    }

    getType(key){
        if(this.has(key)){
            return this.map.get(key).type;
        }
        return null;
    }
}

module.exports = HashTable;