const express = require("express");
const app = express();
const path = require("path");
const color = require("colors");
var http = require("http");
const socket = require("socket.io");
const dotenv = require("dotenv");
const {
  disconnectUser,
  addUser,
  getroomuser,
  getCurrentUser,
} = require("./user");
dotenv.config("/.env");

app.use(express.static(path.join(__dirname, "client")));

//routes
app.get("/", (req, res, next) => {
  return res.send("Okay");
});

const server = http.createServer(app);

const port = process.env.PORT;

server.listen(port, () =>
  console.log(`Example app listening on port ${port}!`.bgGreen)
);

const io = socket(server);

io.on("connection", (socket) => {
  socket.on("UserJoined", ({  roomId }) => {
    if (!getCurrentUser(socket.id)) {
      if (getroomuser(roomId).length< 2) {
        const user = addUser(socket.id, roomId);
        socket.join(user.room)
        socket.broadcast.to(user.room).emit("PeerJoined", {id:user.id,room:user.room});
        
      }
    else if(getroomuser(roomId).length>= 2){
      socket.emit('NotAllowed')
    }
        }
  });

  socket.on("disconnect", () => {
    const user = disconnectUser(socket.id);
    if (user) {
      io.to(user.room).emit('PeerLeft',(user.id))

    }
  });

  socket.on("MessagePeer", (data,MemberId) => {
    const user = getCurrentUser(socket.id);
    if (user) {

        socket.to(user.room).emit('MessageFromPeer',data,MemberId)
    }
  });
});
