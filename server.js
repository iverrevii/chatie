//require express and make an express application
const express = require('express'),
      compression = require('compression');
let app = express();

const server = require('http').createServer(app);
//require socket.io and listen to server
const io = require('socket.io').listen(server);

let Crypt = require("g-crypt"),
    passphrase = 'fcf8afd67e96fa3366dd8eafec8bcace',
    crypter = Crypt(passphrase);

// one month cache period for static files
let cacheTime = 30 * 24 * 60 * 60 * 1000;

// compress all app responses
app.use(compression());
// use the 'public' directory to serve static files (and set cache time)
app.use(express.static(__dirname + '/public', {maxAge: cacheTime}));

let users = [];
let connections = [];

server.listen(3000);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

//when someone connects
io.sockets.on('connection', socket => {
    connections.push(socket);
    console.log('New connection detected! (Total connections: %s)', connections.length);
    socket.on('counter', data => {
        let decriptedData = crypter.decrypt(data);
        setTimeout(() => {
            decriptedData.id++;
            socket.emit('counter', crypter.encrypt(decriptedData));
        }, 1000);
    });
    
    //when a client has disconnected
    socket.on('disconnect', data => {
        users.splice(users.indexOf(socket.username), 1);
        updateUserNames();
        connections.splice(connections.indexOf(socket), 1);
        console.log("A client has disconnected (Total connections now: %s)", connections.length);
    });

    //send message
    socket.on('sendMsg', data => {
        if (data.trim() != "" && data.length <= 27) {
            io.sockets.emit('newMsg', {
                msg: data,
                user: socket.username
            });
        }
        // prints sent/recieved encryptred messages in server log for demo purposes
        console.log(socket.username + ": " + crypter.encrypt(data));
    });

    //new user
    socket.on('newUser', (data, callback) => {
        if(data.length <= 8){
            callback(true);
            socket.username = data;
            users.push(socket.username);
            updateUserNames();
        }
    });

    //update user names function
    function updateUserNames() {
        io.sockets.emit('getUsers', users);
    }
});
console.log("server is live!");