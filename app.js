var express = require("express");
var app = express();
var serv = require("http").Server(app);

app.get('/', function(req, res){
    res.sendFile(__dirname + "/client/index.html");
});
app.use("/client", express.static(__dirname + "/client"));

serv.listen(process.env.PORT || 2000)
console.log("Server Started")

var SOCKET_LIST = {};
var PLAYER_LIST = {};

var playerSize = 40;
var Player = function(id) {
    var self = {
        x: 320-playerSize/2,
        y: 240-playerSize/2,
        id: id,
        address: "Guest " + ((Math.random()+1)*2731).toString(),
        size: playerSize,
        pressingRight: false,
        pressingLeft: false,
        pressingUp: false,
        pressingDown: false,
        maxSpd: 5
    }
    self.updatePosition = function() {
        if (self.pressingRight)
            self.x += self.maxSpd;
        if (self.pressingLeft)
            self.x -= self.maxSpd;
        if (self.pressingUp)
            self.y -= self.maxSpd;
        if (self.pressingDown)
            self.y += self.maxSpd;
    }
    return self;
}

var io = require("socket.io") (serv, {});
io.sockets.on("connection", function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    
    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;
    socket.emit("newId", socket.id);

    socket.on("disconnect", function() {
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
    });

    socket.on("sendMsgToServer", function(data) {
        var playerName;
        if (PLAYER_LIST[socket.id].address.startsWith("G")) {
            playerName = ("" + PLAYER_LIST[socket.id].address).slice(0, 10);
        } else {playerName = ("" + PLAYER_LIST[socket.id].address).slice(0, 7);}
        for (var i in SOCKET_LIST) {
            SOCKET_LIST[i].emit("addToChat", playerName + ": " + data);
        }
    });

    socket.on("newAddress", function(data) {
        PLAYER_LIST[socket.id].address = data;
    });

    socket.on("keyPress", function(data) {
        if (data.inputId == "right")
            player.pressingRight = data.state;
        if (data.inputId == "left")
            player.pressingLeft = data.state;
        if (data.inputId == "up")
            player.pressingUp = data.state;
        if (data.inputId == "down")
            player.pressingDown = data.state;
    });
});

setInterval(function() {
    var pack = [];
    for (var i in PLAYER_LIST) {
        var player = PLAYER_LIST[i];
        player.updatePosition();
        pack.push({
            x: player.x,
            y: player.y,
            size: player.size,
            id: player.id,
            address: player.address
        });
    }

    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit("newPosition", pack);
    }
}, 1000/30);