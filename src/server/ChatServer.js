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

    removeUserFromRoom(socket, roomID) {
        socket.leave(roomID);
        let user = this.users.get(socket.id);
        user.roomID = null;
        this.addUser(socket.id, user);
    }

    addUserToRoom(socket, roomID){
        socket.join(roomID);
        let user = this.users.get(socket.id);
        user.roomID = roomID;
        this.addUser(socket.id, user);
    }


    start(httpServer){
        this.io = new Server(httpServer);
        let self = this;

        this.io.on('connection', (socket) => {
            // listeners
            console.log("Someone connected.");
            self.addUser(socket.id, {});

            socket.on("message_to_room", function(data){
                let user = self.users.get(socket.id);
                self.io.to(user.roomID).emit("message_from_room", data);
            })

            socket.on("join_room", function(data){
                let user = self.users.get(socket.id);
                user.roomID = data.roomID;
                self.addUser(socket.id, user);
            })

            socket.on("disconnect", () => {
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
            self.io.emit("room_joined", users);
        })

        this.io.sockets.adapter.on('leave-room', function(room, id){
            console.log("Leaving room: " + room);
            let users = Array.from(self.users.values()).filter(user => user.roomID === room);
            self.io.emit("room_joined", users);
        })
    }

    stop(){
        this.io.close();
        this.users.clear();
        this.rooms.clear();
    }

}

module.exports = ChatServer;