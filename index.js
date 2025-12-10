const path = require('path');
const http = require("http");
const express = require("express");
const {Server} = require("socket.io");

const port = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');

// Serve pages to be rendered from the views folder
app.set('views', 'views');

// Serve static scritps from the public folder
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