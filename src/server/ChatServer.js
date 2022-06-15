const { Server } = require("socket.io");
const validateToken = require("./middlewares/validateToken");
const uid = require("uid2");

function generateID() {
  return uid(32);
}

class ChatServer {
  constructor() {
    this.io = null;
    this.events = {
      message_to_room: [],
      join_room: [],
    };

    this.users = new Map();
    this.rooms = new Map();
  }

  addUser(id, data) {
    this.users.set(id, data);
  }

  removeUser(id) {
    this.users.delete(id);
  }

  addRoom(roomID, roomMeta) {
    this.rooms.set(roomID, roomMeta);
  }

  removeUserFromCurrentRoom(socket) {
    let user = this.users.get(socket.id);
    let currentRoom = user.roomID;
    this.io.to(currentRoom).emit("message_from_server", {message: `${user.username} has left the room`, timestamp: Date.now()});
    user.roomID = null;
    this.addUser(socket.id, user);
    socket.leave(currentRoom);
  }

  addUserToRoom(socket, roomID) {
    let user = this.users.get(socket.id);
    user.roomID = roomID;
    this.addUser(socket.id, user);
    socket.join(roomID);
  }

  start(httpServer) {
    console.log("Starting server");
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.io.on("connection", (socket) => {
      // listeners
      console.log("Someone connected.");
      this.addUser(socket.id, {
        username: socket.data.username,
        profile_picture: socket.data.profile_picture,
        roomID: null,
      });

      // send rooms
      socket.emit("update_rooms", Array.from(this.rooms.values()));

      socket.on("message_to_room", ({ message }) => {
        let user = this.users.get(socket.id);
        let messageTimestamp = Date.now();
        
        this.io.to(user.roomID).emit("message_from_room", {
          id: generateID() + messageTimestamp,
          user: {
            name: user.username,
            profile_picture: user.profile_picture,
          },
          message: message,
          timestamp: messageTimestamp,
        });
      });

      socket.on("join_room", ({ room }) => {
        this.removeUserFromCurrentRoom(socket);
        this.addUserToRoom(socket, room.id);
        socket.emit("join_room_success", { room });
      });

      socket.on("disconnect", () => {
        this.removeUserFromCurrentRoom(socket);
        this.removeUser(socket.id);
      });
    });

    //middlewares
    this.io.use(validateToken);

    // Adapters listeners
    this.io.sockets.adapter.on("create-room", (room) => {
      console.log("Creating room: " + room);
      this.io.emit("update_rooms", Array.from(this.rooms.values()));
    });

    this.io.sockets.adapter.on("join-room", (room, id) => {
      if(!this.rooms.get(room)) return;
      console.log("Joining room: " + room);
      let users = Array.from(this.users.values()).filter(
        (user) => user.roomID === room
      );
      this.io.to(room).emit("other_user_joined_room", {
        users: users,
        newUser: this.users.get(id) && this.users.get(id).username,
      });

      // this makes the "join_room_success" emit first
      setTimeout(() => {
        this.io.to(room).emit("message_from_server", {message: `${this.users.get(id).username} has joined the room`, timestamp: Date.now()});
      }, 0);
    });

    this.io.sockets.adapter.on("leave-room", (room, IDOfUserThatLeft) => {
      if(!this.rooms.get(room)) return;
      let users = Array.from(this.users.values()).filter(
        (user) => user.roomID === room
      );
      this.io.to(room).emit("other_user_left_room", {
        users: users,
        userThatLeft:
          this.users.get(IDOfUserThatLeft) &&
          this.users.get(IDOfUserThatLeft).username,
      });
    });

  }

  stop() {
    this.io.close();
    this.users.clear();
    this.rooms.clear();
  }
}

module.exports = ChatServer;
