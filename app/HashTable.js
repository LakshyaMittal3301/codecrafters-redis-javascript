class HashTable{
    constructor(){
        this.map = new Map();
    }

    insert(key, value, type = 'string'){
        return this.insertWithExpiry(key, value, 1000 * 60 * 60 * 24, type);
    }

    insertWithExpiry(key, value, expiry, type = 'string'){
        let expiryTimestamp = parseInt(expiry) + Date.now();
        return this.insertKeyWithTimeStamp(key, value, expiryTimestamp, type);
    }

    insertKeyWithTimeStamp(key, value, timestamp, type = 'string'){
        if(type === 'string'){
            this.map.set(key, {value, expiry: timestamp, type});
            return true;
        } else if(type === 'stream'){
            if(!this.map.has(key)) this.map.set(key, {value: [], expiry: timestamp, type});
            let existingValue = this.map.get(key);

            if(existingValue.value.length === 0){
                existingValue.value.push(value);
                this.map.set(key, existingValue); 
                return true;
            }

            let lastEntry = existingValue.value.slice(-1)[0];
            let lastId = lastEntry['id'].split('-');
            let lastIdMilisecond = lastId[0];
            let lastIdSequence = lastId[1];
            
            let currentId = value['id'].split('-');
            let currentIdMilisecond = currentId[0];
            let currentIdSequence = currentId[1];

            if(currentIdMilisecond < lastIdMilisecond) return false;
            if(currentIdMilisecond === lastIdMilisecond && currentIdSequence <= lastIdSequence) return false;

            existingValue.value.push(value);
            this.map.set(key, existingValue); 
            return true;

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