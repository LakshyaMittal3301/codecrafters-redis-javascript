class HashTable{
    constructor(){
        this.map = new Map();
    }

    insert(key, value){
        this.map.set(key, value);
    }

    get(key){
        if(this.has(key)){
            return this.map.get(key);
        }
        return null;
    }

    has(key){
        return this.map.has(key);
    }
}

module.exports = HashTable;