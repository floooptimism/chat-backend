const {io} = require('socket.io-client');

class ChatClient{
    constructor(url, username, token){
        this.username = username;
        this.token = token;
        this.url = url;
        this.io = null;
        this.events = {
            message_from_room: [],
            rooms_list: [],
            room_joined: []
        };
        this.connected = false;
    }

    connect(success, fail){
        this.io = new io(this.url, {
            auth: {
                token: this.token
            }
        });

        let self = this;

        this.io.on('connect', () => {
            this.connected = true;
            success && success();
        });
        this.io.on('connect_error', fail || function(){});


        this.io.on('message_from_room', function (message){
            self.notifySubscribers('message_from_room', message);
        });
        this.io.on('rooms_list', function (rooms){
            self.notifySubscribers('rooms_list', rooms);
        });

        this.io.on('room_joined', function(users){
            self.notifySubscribers('room_joined', users);
        });
    }

    sendMessage(message){
        this.io.emit('message_to_room', {
            user: this.username,
            message: message
        });
    }

    joinRoom(roomID) {
        this.io.emit('join_room', {roomID: roomID});
    }


    notifySubscribers(event, data){
        for(let callback of this.events[event]){
            callback(data);
        }
    }

    subscribe(event, callback){
        if(!this.events[event]){
            throw new Error("Event not found");
        }
        this.events[event].push(callback);

        return function(){
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    disconnect(){
        this.io && this.io.disconnect();
        this.io = null;
    }
}

module.exports = ChatClient;