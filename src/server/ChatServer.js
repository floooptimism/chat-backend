const { Server } = require('socket.io');

class ChatServer{
    constructor(){
        this.io = null;
        this.events = {
            message_to_room: [],
            join_room: [],
        };

        this.users = new Map();
        this.rooms = new Map();

    }

    addUser(id, data){
        this.users.set(id, data);
    }

    removeUser(id){
        this.users.delete(id);
    }

    addRoom(roomID, roomName){
        this.rooms.set(roomID, roomName);
    }

    removeUserFromCurrentRoom(socket) {
        let user = this.users.get(socket.id);
        let currentRoom = user.roomID;
        user.roomID = null;
        this.addUser(socket.id, user);
        socket.leave(currentRoom);
    }

    addUserToRoom(socket, roomID){
        let user = this.users.get(socket.id);
        user.roomID = roomID;
        this.addUser(socket.id, user);
        socket.join(roomID);
    }


    start(httpServer){
        this.io = new Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        let self = this;

        this.io.on('connection', (socket) => {
            // listeners
            console.log("Someone connected.");
            self.addUser(socket.id, {username: socket.handshake.query.username, roomID: null});

            socket.on("message_to_room", function({message}){
                let user = self.users.get(socket.id);
                if(!self.rooms.get(user.roomID)) return;
                self.io.to(user.roomID).emit("message_from_room", {user: user.username, message: message});
            })

            socket.on("join_room", function({roomID}){
                self.removeUserFromCurrentRoom(socket);
                self.addUserToRoom(socket, roomID);
                socket.emit('join_room_success', {roomID});
            })

            socket.on("disconnect", () => {
                self.removeUserFromCurrentRoom(socket);
                self.removeUser(socket.id);
            })
        });

        //middlewares


        // Adapters listeners
        this.io.sockets.adapter.on('create-room', function(room) {
            console.log("Creating room: " + room);
            self.io.emit("rooms_list", Array.from(self.rooms.values()));
        });

        this.io.sockets.adapter.on('join-room', function(room, id){
            console.log("Joining room: " + room);
            let users = Array.from(self.users.values()).filter(user => user.roomID === room);
            self.io.to(room).emit("joined_room", {
                users: users,
                newUser: self.users.get(id) && self.users.get(id).username,
            });
        })

        this.io.sockets.adapter.on('leave-room', function(room, IDOfUserThatLeft){
            console.log("Leaving room: " + room);
            let users = Array.from(self.users.values()).filter(user => user.roomID === room);
            self.io.to(room).emit("left_room", {
                users: users,
                userThatLeft: self.users.get(IDOfUserThatLeft) && self.users.get(IDOfUserThatLeft).username
            });
        })
    }

    stop(){
        this.io.close();
        this.users.clear();
        this.rooms.clear();
    }

}

module.exports = ChatServer;