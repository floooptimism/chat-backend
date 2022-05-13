// set up an express server
const { createServer }  = require('http');
const express = require('express');
const ChatServer = require('./server/ChatServer');

const app = express();
const server = createServer(app);
const chatServer = new ChatServer();


// Socket IO Server
chatServer.start(server);

server.listen(3000, () => {
    console.log('listening on port 3000');
});



