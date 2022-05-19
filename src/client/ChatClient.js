const {io} = require('socket.io-client');
const {log} = require('console-log-colors')

/**
 * Client for the chat socket server
 */
class ChatClient{

    /**
     * 
     * @param {string} url - the url of the socket server
     * @param {string} username - the username of the client
     * @param {string} token - the token of the client
     */
    constructor(url, username, token){
        /** @property {string} username - Client username */
        this.username = username;
        /** @property {string} token - Client token for authentication to the socket server */
        this.token = token;
        /** @property {Array} rooms_list - Stores all the current rooms the socket server has */
        this.rooms = [];
        /** @property {Array} usersInRoom - Stores all the users in the current room the client is in  */
        this.usersInRoom = [];
        /** @property {string} url - URL of the socket server */
        this.url = url;

        /**
         * @property {object} io - The Socket.io client object
         */
        this.io = null;

        /**
         * @property {object} events  - a map of event names to callback functions
         */
        this.events = {
            message_from_room: [],
            rooms_list: [],
            joined_room: [],
            left_room: []
        };

        /** @property {Boolean} connected - Indicates if the client is connnected or not */
        this.connected = false;
    }

    updateRooms(rooms){
        this.rooms = rooms;
    }

    updateUsersInRoom(users){
        this.usersInRoom = users;
    }

    /**
     * Connects to a socket server
     * @param {function} success - callback function to be called when the client is connected
     * @param {function} fail - callback function to be called when the client fails to connect
     */
    connect(success, fail){
        this.io = new io(this.url, {
            auth: {
                token: this.token
            },
            query: "username=" + this.username
        });

        let self = this;

        this.io.on('connect', () => {
            this.connected = true;
            success && success();
        });
        this.io.on('connect_error', fail || function(){});

        this.io.on('message_from_room', function ({user, message}){
            console.log(log.yellow(`${user}: ${message}`));
            self.notifySubscribers('message_from_room', {user, message});
        });
        this.io.on('rooms_list', function (rooms){
            self.updateRooms(rooms);
            self.notifySubscribers('rooms_list', rooms);
        });

        this.io.on('joined_room', function({users, newUser}){
            self.updateUsersInRoom(users);
            console.log(log.green(`${newUser} has joined the room.`));
            self.notifySubscribers('joined_room', {users, newUser});
        });

        this.io.on('left_room', function({users, userThatLeft}){
            self.updateUsersInRoom(users);
            console.log(log.green(`${userThatLeft} has left the room.`));
            self.notifySubscribers('left_room', {users, userThatLeft});
        });
    }

    /**
     * Sends a message to a room the user is currently in
     * @param {string} message 
     */
    sendMessage(message){
        this.io.emit('message_to_room', {
            message: message
        });
    }

    /**
     * Joins a room
     * @param {string} roomID 
     */
    joinRoom(roomID) {
        this.io.emit('join_room', {roomID: roomID});
    }

    /**
     * Will notify all subscribers of an event
     * @param {string} event 
     * @param {object} data 
     */
    notifySubscribers(event, data){
        for(let callback of this.events[event]){
            callback(data);
        }
    }

    /**
     * Subscribes to an event
     * @param {string} event - the event to subscribe to
     * @param {function} callback - the callback function to be called when the event is triggered
     * @returns {function} - a function to unsubscribe from the event
     */
    subscribe(event, callback){
        if(!this.events[event]){
            throw new Error("Event not found");
        }
        this.events[event].push(callback);

        return function(){
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Disconnects from the socket server
     */
    disconnect(){
        this.io && this.io.disconnect();
        this.connected = false;
        this.io = null;
    }
}

module.exports = ChatClient;