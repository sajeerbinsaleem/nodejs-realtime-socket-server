'use strict';

const moment = require('moment');
const path = require('path');
const fs = require('fs');
const config = fs.readFileSync('./config.json');
const AWS = require('aws-sdk');
let helper;

class Socket {

    constructor(socket) {
        this.io = socket;
    }

    socketEvents() {
        this.io.on('connection', (socket) => {
            /**
            * get the tenents user's Chat list
            */
            socket.on('getChatList', async (userId, tenantId, slug, role = null) => {
                // let query = `SELECT DISTINCT u.id, u.name, u.socket_id, u.online, u.updated_at FROM users u WHERE u.id != ${userId} ORDER BY u.updated_at DESC`;
                // let query = `Select DISTINCT u.id,u.name,u.socket_id,u.online,u.updated_at, t.slug from users u 
                //                 left join user_tenants ut on ut.user_id = u.id
                //                 left join tenants t on t.id = ut.tenant_id
                //                 left join messages m on m.to_user_id = u.id
                //                 where u.id != ${userId} 
                //                 order by u.socket_id DESC`;

                let query = `Select distinct u.id,u.name,u.socket_id,u.online, u.updated_at, t.slug,
                (select created_at from messages where from_user_id = u.id 
                 Order by created_at DESC LIMIT 1) as message_at, (select count(is_read) from messages
                 where from_user_id =  u.id AND to_user_id = ${userId} AND is_read = 0) as count
                 from users u 
                 left join user_tenants ut on ut.user_id = u.id
                 left join tenants t on t.id = ut.tenant_id
                 where u.id != ${userId} 
                 order by u.socket_id DESC, message_at DESC`;

                if (slug) {
                    // query = `SELECT DISTINCT u.id, u.name, u.socket_id, u.online, u.updated_at FROM users u, user_tenants ut, tenants t, logezy_${slug}.roles r WHERE u.id != ${userId} AND ut.user_id = u.id AND ut.tenant_id = t.id AND ut.tenant_id = ${tenantId} ORDER BY u.updated_at DESC`;
                    // query = `Select DISTINCT u.id,u.name,u.socket_id,u.online, u.updated_at, t.slug from users u 
                    //             left join user_tenants ut on ut.user_id = u.id
                    //             left join tenants t on t.id = ut.tenant_id
                    //             left join messages m on m.to_user_id = u.id
                    //             where u.id != ${userId} AND ut.tenant_id = ${tenantId}
                    //             order by u.socket_id DESC`;

                    
                    switch(role){
                        case 'admin':
                            query = `Select distinct u.id,u.name,u.socket_id,u.online, u.updated_at, t.slug,
                            (select created_at from messages where from_user_id = u.id 
                             Order by created_at DESC LIMIT 1) as message_at, (select count(is_read) from messages
                             where from_user_id =  u.id AND to_user_id = ${userId} AND is_read = 0) as count
                             from users u 
                             left join user_tenants ut on ut.user_id = u.id
                             left join tenants t on t.id = ut.tenant_id
                             where u.id != ${userId} AND ut.tenant_id = ${tenantId}
                             order by u.socket_id DESC, message_at DESC`;
                            break;
                        case 'manager':
                            query = `Select distinct u.id,u.name,u.socket_id,u.online, u.updated_at, t.slug,
                            (select created_at from messages where from_user_id = u.id 
                             Order by created_at DESC LIMIT 1) as message_at, (select count(is_read) from messages
                             where from_user_id =  u.id AND to_user_id = ${userId} AND is_read = 0) as count
                             from users u 
                             left join user_tenants ut on ut.user_id = u.id
                             left join tenants t on t.id = ut.tenant_id
                             where u.id != ${userId} AND ut.tenant_id = ${tenantId}
                             order by u.socket_id DESC, message_at DESC`;
                            break;
                        case 'candidate':
                            query = `Select distinct u.id,u.name,u.socket_id,u.online, u.updated_at, t.slug,  
                            (select created_at from messages where from_user_id = u.id 
                             Order by created_at DESC LIMIT 1) as message_at, (select count(is_read) from messages
                             where from_user_id =  u.id AND to_user_id = ${userId} AND is_read = 0) as count
                            from users u 
                            left join user_tenants ut on ut.user_id = u.id
                            left join tenants t on t.id = ut.tenant_id
                             join logezy_${slug}.role_users ru on u.id = ru.user_id
                             join logezy_${slug}.roles r on ru.role_id = r.id
                            where u.id != ${userId} AND ut.tenant_id = ${tenantId} AND r.name != 'candidate'
                            order by u.socket_id DESC, message_at DESC`;
                            break;
                        default:
                            query = `Select distinct u.id,u.name,u.socket_id,u.online, u.updated_at, t.slug,
                            (select created_at from messages where from_user_id = u.id 
                             Order by created_at DESC LIMIT 1) as message_at, (select count(is_read) from messages
                             where from_user_id =  u.id AND to_user_id = ${userId} AND is_read = 0) as count
                             from users u 
                             left join user_tenants ut on ut.user_id = u.id
                             left join tenants t on t.id = ut.tenant_id
                             where u.id != ${userId} AND ut.tenant_id = ${tenantId}
                             order by u.socket_id DESC, message_at DESC`;
                    }
                }
                const result = await helper.getChatList(query);
                const count = await helper.getUnreadMsgCount(userId);
                this.io.to(socket.id).emit('chatListRes', {
                    userConnected: false,
                    chatList: result.chatlist,
                    unreadCount: count.unreadCount
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
                await helper.readMessages(data.toUserId, data.fromUserId);
                
                if (result === null) {
                    this.io.to(socket.id).emit('getMessagesResponse', { result: [], toUserId: data.toUserId });
                } else {
                    this.io.to(socket.id).emit('getMessagesResponse', { result: result, toUserId: data.toUserId });
                }
            });

            /**
            * send the messages to the user
            */
            socket.on('addMessage', async (response) => {
                response.date = new moment().format("Y-MM-D");
                response.time = new moment().format("hh:mm A");
                this.insertMessage(response, socket);
                const toUsers = await helper.getSocketId(response.toUserId);
                for (const toUser of toUsers) {
                    console.log('sending message to user', toUser.socket_id);
                    socket.to(toUser.socket_id).emit('addMessageResponse', response);
                }
            });

            socket.on('typing', async (data) => {
                await helper.readMessages(data.toUserId, data.fromUserId);
                socket.to(data.socket_id).emit('typing', { typing: data.typing, to_socket_id: socket.id });
            });

            socket.on('upload-image', async (response) => {
                const BUCKET = process.env.S3_BUCKET
                const REGION = process.env.S3_REGION
                const ACCESS_KEY = process.env.S3_ACCESS_KEY
                const SECRET_KEY = process.env.S3_SECRET_KEY

                AWS.config.update({
                    accessKeyId: ACCESS_KEY,
                    secretAccessKey: SECRET_KEY,
                    region: REGION
                });
                const s3 = new AWS.S3();
                const imageRemoteName = response.fileName;
                const toUser = await helper.getSocketId(response.toUserId);
                s3.upload({
                    Bucket: BUCKET,
                    Body: response.message,
                    Key: imageRemoteName,
                    ContentType: 'image/jpg'
                }).promise().then(res => {
                    response.message = response.fileName;
                    response.filePath = res.Location;
                    response.date = new moment().format("Y-MM-D");
                    response.time = new moment().format("hh:mm A");
                    this.insertMessage(response, socket);
                    socket.to(toUser[0].socket_id).emit('addMessageResponse', response);
                    socket.emit('image-uploaded', response);
                }).catch(err => {
                    console.log('failed:', err)
                })
            });

            /**
            * get the Notifications
            */
            socket.on('getNotification', async (data) => {
                var notifications = await helper.getNotification(data.user_id, data.tenant_id,data.tenant_slug);
                if (notifications === null) {
                    this.io.to(socket.id).emit('notificationRes', { result: [], toUserId: data.user_id });
                } else {
                    this.io.to(socket.id).emit('notificationRes', { result: notifications, toUserId: data.user_id });
                }
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

    async insertMessage(data, socket) {


        const sqlResult = await helper.insertMessages({
            type: data.type,
            fileFormat: data.fileFormat,
            filePath: data.filePath,
            fromUserId: data.fromUserId,
            toUserId: data.toUserId,
            message: data.message,
            date: data.date,
            time: data.time,
            tenant_slug: data.tenant_slug,
            ip: socket.request.connection.remoteAddress
        });
    }
    async addSocketId(userId, userSocketId, next) {

        helper = require('./helper');
        const response = await helper.addSocketId(userId, userSocketId);
        if (response && response !== null) {
            next();
        } else {
            console.error(`Socket connection failed, for  user Id ${userId}.`);
        }
    }

    setEnvVariables(clientConfig, authParams, userSocketId, next) {
        process.env.DBPort = clientConfig.dbConfig.DBPort;
        process.env.DBHost = clientConfig.dbConfig.DBHost;
        process.env.DBUser = clientConfig.dbConfig.DBUser;
        process.env.DBPassword = clientConfig.dbConfig.DBPassword;
        process.env.Database = clientConfig.dbConfig.Database;


        process.env.S3_BUCKET = clientConfig.s3.S3_BUCKET;
        process.env.S3_REGION = clientConfig.s3.S3_REGION;
        process.env.S3_ACCESS_KEY = clientConfig.s3.S3_ACCESS_KEY;
        process.env.S3_SECRET_KEY = clientConfig.s3.S3_SECRET_KEY;


        this.validateAccessToken(authParams, userSocketId, clientConfig, next);
    }

    validateAccessToken(authParams, userSocketId, clientConfig, next) {
        if (authParams.token == clientConfig.authorization.token && authParams.clientId == clientConfig.authorization.clientID) {
            this.addSocketId(authParams.id, userSocketId, next);
        } else {
            console.log('error');
            next(new Error('Authentication error'));
        }
    }
    socketConfig() {
        this.io.use(async (socket, next) => {
            let authParams = JSON.parse(socket.handshake.query.id);
            // console.log('authParams', authParams);
            let clientId = authParams.clientId;
            let userSocketId = socket.id;
            let clientConfig = JSON.parse(config)[clientId];
            this.setEnvVariables(clientConfig, authParams, userSocketId, next); // Set env variables
        });
        this.socketEvents();
    }
}
module.exports = Socket;
