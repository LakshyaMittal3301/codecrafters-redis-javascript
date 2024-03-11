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
        this.map.set(key, {value, expiry: timestamp, type: 'string'});
    }

    insertStream(key, value){
        if(!this.map.has(key)) this.map.set(key, {value: [], type: 'stream'});
        let existingValue = this.map.get(key);
        
        let currentId = value['id'];

        if(currentId === '*'){
            currentId = `${Date.now()}-*`;
        }
        
        let currentIdMilisecond = currentId.split('-')[0];
        let currentIdSequence = currentId.split('-')[1];
        
        if(currentIdSequence === '*'){
            if(existingValue.value.length === 0){
                if(currentIdMilisecond === '0') currentIdSequence = '1';
                else currentIdSequence = '0';
                currentId = currentIdMilisecond + '-' + currentIdSequence;
            } else{
                let lastEntry = existingValue.value.slice(-1)[0];
                let lastId = lastEntry['id'].split('-');
                let lastIdMilisecond = lastId[0];
                let lastIdSequence = lastId[1];
    
                if(currentIdMilisecond < lastIdMilisecond) return null;
                if(currentIdMilisecond === lastIdMilisecond){
                    currentIdSequence = `${parseInt(lastIdSequence) + 1}`;
                    currentId = currentIdMilisecond + '-' + currentIdSequence;
                }
                else {
                    currentIdSequence = '0';
                    currentId = currentIdMilisecond + '-' + currentIdSequence;   
                }
            }
            value['id'] = currentId;
            existingValue.value.push(value);
            this.map.set(key, existingValue); 
            return currentId;
        }

        if(existingValue.value.length !== 0){
            let lastEntry = existingValue.value.slice(-1)[0];
            let lastId = lastEntry['id'];
            let lastIdMilisecond = lastId.split('-')[0];
            let lastIdSequence = lastId.split('-')[1];
            
    
            if(currentIdMilisecond < lastIdMilisecond) return null;
            if(currentIdMilisecond === lastIdMilisecond && currentIdSequence <= lastIdSequence) return null;
        }

        existingValue.value.push(value);
        this.map.set(key, existingValue); 
        return currentId;
    }

    get(key){
        if(this.has(key)){
            return this.map.get(key).value;
        }
        return null;
    }

    getStream(key, start, end){
        if(start === '-') start = '0-1';
        if(end === '+') end = `${Number.MAX_SAFE_INTEGER}-${Number.MAX_SAFE_INTEGER}`;
        if(!start.includes('-')) start += `-0`;
        if(!end.includes('-')) end += `-${Number.MAX_SAFE_INTEGER}`;
        let entries = this.map.get(key).value;
        entries = entries.filter((entry) => {
            return entry.id >= start && entry.id <= end;
        });

        let ret = [];

        for(const entry of entries){
            let arr = [entry.id];
            let subarr = [];
            for(const entryKey of Object.keys(entry)){
                if(entryKey === 'id') continue;
                subarr.push(entryKey);
                subarr.push(entry[entryKey]);
            }
            arr.push(subarr);
            ret.push(arr);
        }
        return ret;
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