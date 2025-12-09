function createID(){
    let ID = "";
    let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    for(let i = 0; i<10; i++){
        ID += chars.charAt(Math.floor(Math.random()*62));
    }
    return ID;
}