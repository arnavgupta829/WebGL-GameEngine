const path = require('path');
const http = require("http");
const express = require("express");
const {Server} = require("socket.io");

const port = 8000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');

// HTML pages are picked from the views dir
app.set('views', 'views');

// Serve static files from the public folder (all js scripts)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res, next) => {
  res.render('index');
});

io.on('connection', (socket) => {
  console.log("Socket.IO connected");

  socket.on('msg', msg => socket.broadcast.emit('msg', msg));

  socket.on('disconnect', () => {
    console.log("Socket.IO disconnected");
  });
});

server.listen(port, () => {
  console.log("Server started on port " + port);
});