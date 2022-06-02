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

// add test rooms
chatServer.addRoom('testRoom', {
    id: 'testRoom',
    name: 'Testing Room',
    description: 'This is a test room',
    image: 'https://ui-avatars.com/api/?name=Testing+Room'
})

chatServer.addRoom('testRoom2', {
    id: 'testRoom2',
    name: "Another Room",
    description: 'Welcome welcome welcome',
    image: 'https://ui-avatars.com/api/?name=Another+Room'
})

// Socket IO Server
chatServer.start(server);


// hello world repsond
app.get("/", (req, res) => {
    res.send("Hello World");
})

server.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});



