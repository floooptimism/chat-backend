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

  addRoom(roomID, roomName) {
    this.rooms.set(roomID, roomName);
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
    let self = this;

    this.io.on("connection", (socket) => {
      // listeners
      console.log("Someone connected.");
      self.addUser(socket.id, {
        username: socket.data.username,
        profile_picture: socket.data.profile_picture,
        roomID: null,
      });

      // send rooms
      socket.emit("update_rooms", Array.from(self.rooms.values()));

      socket.on("message_to_room", function ({ message }) {
        let user = self.users.get(socket.id);
        let messageTimestamp = Date.now();
        // if(!self.rooms.get(user.roomID)) return;
        self.io.to(user.roomID).emit("message_from_room", {
          id: generateID() + messageTimestamp,
          user: {
            name: user.username,
            profile_picture: user.profile_picture,
          },
          message: message,
          timestamp: messageTimestamp,
        });
      });

      socket.on("join_room", function ({ room }) {
        self.removeUserFromCurrentRoom(socket);
        self.addUserToRoom(socket, room.channelId);
        socket.emit("join_room_success", { room });
      });

      socket.on("disconnect", () => {
        self.removeUserFromCurrentRoom(socket);
        self.removeUser(socket.id);
      });
    });

    //middlewares
    this.io.use(validateToken);

    // Adapters listeners
    this.io.sockets.adapter.on("create-room", function (room) {
      console.log("Creating room: " + room);
      self.io.emit("update_rooms", Array.from(self.rooms.values()));
    });

    this.io.sockets.adapter.on("join-room", function (room, id) {
      if(!self.rooms.get(room)) return;
      console.log("Joining room: " + room);
      let users = Array.from(self.users.values()).filter(
        (user) => user.roomID === room
      );
      self.io.to(room).emit("other_user_joined_room", {
        users: users,
        newUser: self.users.get(id) && self.users.get(id).username,
      });

      // this makes the "join_room_success" emit first
      setTimeout(() => {
        self.io.to(room).emit("message_from_server", {message: `${self.users.get(id).username} has joined the room`, timestamp: Date.now()});
      }, 0);
    });

    this.io.sockets.adapter.on("leave-room", function (room, IDOfUserThatLeft) {
      console.log("Leaving room: " + room);
      let users = Array.from(self.users.values()).filter(
        (user) => user.roomID === room
      );
      self.io.to(room).emit("other_user_left_room", {
        users: users,
        userThatLeft:
          self.users.get(IDOfUserThatLeft) &&
          self.users.get(IDOfUserThatLeft).username,
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
