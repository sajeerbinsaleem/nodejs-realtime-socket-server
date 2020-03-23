'use strict';

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const socketEvents = require('./utils/socket');

const dotenv = require('dotenv');
dotenv.config();

class Server {
	constructor() {
		this.port = process.env.PORT || 3000;
        this.host = process.env.URL || 'localhost';

        this.app = express();
        this.http = http.Server(this.app);
        this.socket = socketio(this.http);


        this.app.get('/check', function (req, res) { // test route
            res.send('Welcome to Logezy chat API server')
        });
	}

	appRun(){
		new socketEvents(this.socket).socketConfig();
		this.app.use(express.static(__dirname + '/uploads'));
        this.http.listen(this.port, this.host, () => {
            console.log(`Logezy chat API server is on http://${this.host}:${this.port}`);
        });
    }
}

const app = new Server();

app.appRun();
