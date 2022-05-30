// set up an express server
const { createServer }  = require('http');
const express = require('express');
const ChatServer = require('./server/ChatServer');
const port = process.env.PORT || 3001;

const cors = require('cors');
const app = express();

app.use(cors());

const server = createServer(app);
const chatServer = new ChatServer();


// Socket IO Server
chatServer.start(server);

server.listen(process.env.PORT || , () => {
    console.log(`Listening on port: ${port}`);
});



