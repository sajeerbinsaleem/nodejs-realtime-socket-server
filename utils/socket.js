'use strict';

const moment = require('moment');
const path = require('path');
const fs = require('fs');
const helper = require('./helper');
const AWS = require('aws-sdk');

const BUCKET = process.env.S3_BUCKET
const REGION = process.env.S3_REGION
const ACCESS_KEY = process.env.S3_ACCESS_KEY
const SECRET_KEY = process.env.S3_SECRET_KEY

class Socket{

    constructor(socket){
        this.io = socket;
    }

    socketEvents(){
        this.io.on('connection', (socket) => {
            /**
            * get the user's Chat list
            */
            socket.on('chatList', async (userId) => {
                const result = await helper.getChatList(userId);
                this.io.to(socket.id).emit('chatListRes', {
                    userConnected: false,
                    chatList: result.chatlist
                });

                socket.broadcast.emit('chatListRes', {
                    userConnected: true,
                    userId: userId,
                    socket_id: socket.id
                });
            });

            /**
            * get the tenents user's Chat list
            */
           socket.on('chatListCustomers', async (userId, tenantId, slug) => {
                const result = await helper.getCustomersChatList(userId, tenantId, slug);
                this.io.to(socket.id).emit('chatListRes', {
                    userConnected: false,
                    chatList: result.chatlist
                });

                socket.broadcast.emit('chatListRes', {
                    userConnected: true,
                    userId: userId,
                    socket_id: socket.id
                });
            });
            /**
            * get the get messages
            */
            socket.on('getMessages', async (data) => {
                const result = await helper.getMessages(data.fromUserId, data.toUserId);
				if (result === null) {
                    this.io.to(socket.id).emit('getMessagesResponse', {result:[],toUserId:data.toUserId});
				}else{
                    this.io.to(socket.id).emit('getMessagesResponse', {result:result,toUserId:data.toUserId});
				}
            });

            /**
            * send the messages to the user
            */
            socket.on('addMessage', async (response) => {
                response.date = new moment().format("Y-MM-D");
                response.time = new moment().format("hh:mm A");
                this.insertMessage(response, socket);
                console.log('sending message to user', response.toSocketId);
                socket.to(response.toSocketId).emit('addMessageResponse', response);
            });

            socket.on('typing', function (data) {
                socket.to(data.socket_id).emit('typing', {typing:data.typing, to_socket_id:socket.id});
            });

            socket.on('upload-image', async (response) => {
                AWS.config.update({
                    accessKeyId: ACCESS_KEY,
                    secretAccessKey: SECRET_KEY,
                    region: REGION
                });
                const s3 = new AWS.S3();
                const imageRemoteName = response.fileName;
                console.log('upload image emited', response);
                s3.upload({
                    Bucket: BUCKET,
                    Body: response.message,
                    Key: imageRemoteName,
                    ContentType: 'image/jpg'
                }).promise().then(res => {
                    console.log('s3 resp', res);
                    response.message = response.fileName;
                    response.filePath = res.Location;
                    response.date = new moment().format("Y-MM-D");
                    response.time = new moment().format("hh:mm A");
                    this.insertMessage(response, socket);
                    socket.to(response.toSocketId).emit('addMessageResponse', response);
                    socket.emit('image-uploaded', response);
                }).catch(err => {
                    console.log('failed:', err)
                })
                // let dir = moment().format("D-M-Y")+ "/" + moment().format('x') + "/" + response.fromUserId
                // await helper.mkdirSyncRecursive(dir);
                // let filepath = dir + "/" + response.fileName;
                // var writer = fs.createWriteStream(path.basename('uploads') + "/" + filepath, { encoding: 'base64'});
                // writer.write(response.message);
                // writer.end();
                // writer.on('finish', function () {
                //     response.message = response.fileName;
                //     response.filePath = filepath;
                //     response.date = new moment().format("Y-MM-D");
                //     response.time = new moment().format("hh:mm A");
                //     this.insertMessage(response, socket);
                //     socket.to(response.toSocketId).emit('addMessageResponse', response);
                //     socket.emit('image-uploaded', response);
                // }.bind(this));
            });

            socket.on('disconnect', async () => {
                const isLoggedOut = await helper.logoutUser(socket.id);
                socket.broadcast.emit('chatListRes', {
                    userDisconnected: true,
                    socket_id: socket.id
                });
        	});
        });
    }

    async insertMessage(data, socket){
        const sqlResult = await helper.insertMessages({
            type: data.type,
            fileFormat: data.fileFormat,
            filePath: data.filePath,
            fromUserId: data.fromUserId,
            toUserId: data.toUserId,
            message: data.message,
            date: data.date,
            time: data.time,
            ip: socket.request.connection.remoteAddress
        });
    }

    socketConfig(){
        this.io.use( async (socket, next) => {
            let userId = socket.request._query['id'];
            let userSocketId = socket.id;
            const response = await helper.addSocketId( userId, userSocketId);
            if(response &&  response !== null){
                next();
            }else{
                console.error(`Socket connection failed, for  user Id ${userId}.`);
            }
        });
        this.socketEvents();
    }
}
module.exports = Socket;
