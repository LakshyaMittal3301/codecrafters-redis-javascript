class HashTable{
    constructor(){
        this.map = new Map();
    }

    insert(key, value){
        this.insertWithExpiry(key, value, 1000 * 60 * 60 * 24);
    }

    insertWithExpiry(key, value, expiry){
        let expiryTimestamp = parseInt(expiry) + Date.now();
        this.insertKeyWithTimeStamp(key, value, expiryTimestamp);
    }

    insertKeyWithTimeStamp(key, value, timestamp){
        this.map.set(key, {value, expiry: timestamp});
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
}

module.exports = HashTable;