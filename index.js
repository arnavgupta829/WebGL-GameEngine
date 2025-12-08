const http = require("http");
const express = require("express");
const {Server} = require("socket.io");

const port = 8000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');
app.set('views', 'views');

app.get('/', (req, res, next) => {
  res.render('index');
});

io.on('connection', (socket) => {
  console.log("Socket.IO connected");

  socket.on('msg', msg => handleMessage(msg));

  socket.on('disconnect', () => {
    console.log("Socket.IO disconnected");
  });
});

function handleMessage(msg) {
  console.log(msg);
}

server.listen(port, () => {
  console.log("Server started on port " + port);
});