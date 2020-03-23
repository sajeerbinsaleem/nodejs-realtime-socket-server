'user strict';

const DB = require('./db');
const path = require('path');
const fs = require('fs');

class Helper{

	constructor(app){
		this.db = DB;
	}

	async addSocketId(userId, userSocketId){
		try {
			return await this.db.query(`UPDATE users SET socket_id = ?, online= ? WHERE id = ?`, [userSocketId,'Y',userId]);
		} catch (error) {
			console.log(error);
			return null;
		}
	}

	async logoutUser(userSocketId){
		return await this.db.query(`UPDATE users SET socket_id = ?, online= ? WHERE socket_id = ?`, ['','N',userSocketId]);
	}

	// getChatList(userId){
	// 	try {
	// 		return Promise.all([
	// 			this.db.query(`SELECT u.id, u.name, u.socket_id, u.online, u.updated_at FROM users u, user_tenants ut, tenants t WHERE u.id != ? AND ut.user_id = u.id AND ut.tenant_id = t.id`, [userId])
	// 		]).then( (response) => {
	// 			return {
	// 				chatlist : response[0]
	// 			};
	// 		}).catch( (error) => {
	// 			console.warn(error);
	// 			return (null);
	// 		});
	// 	} catch (error) {
	// 		console.warn(error);
	// 		return null;
	// 	}
	// }

	getChatList(userId, tenantId, slug){
		try {
			console.log(`SELECT DISTINCT u.id, u.name, u.socket_id, u.online, u.updated_at FROM users u, user_tenants ut, tenants t, logezy_${slug}.roles r WHERE u.id != ${userId} AND ut.user_id = u.id AND ut.tenant_id = t.id AND ut.tenant_id = ${tenantId}`);
			return Promise.all([
				this.db.query(`SELECT DISTINCT u.id, u.name, u.socket_id, u.online, u.updated_at FROM users u, user_tenants ut, tenants t, logezy_${slug}.roles r WHERE u.id != ? AND ut.user_id = u.id AND ut.tenant_id = t.id AND ut.tenant_id = ?`, [userId, tenantId])
			]).then( (response) => {
				return {
					chatlist : response[0]
				};
			}).catch( (error) => {
				console.warn(error);
				return (null);
			});
		} catch (error) {
			console.warn(error);
			return null;
		}
	}

	async insertMessages(params){
		try {
			return await this.db.query("INSERT INTO messages (`type`, `file_format`, `file_path`, `from_user_id`,`to_user_id`,`message`, `date`, `time`, `ip`) values (?,?,?,?,?,?,?,?,?)", [params.type, params.fileFormat, params.filePath, params.fromUserId, params.toUserId, params.message, params.date, params.time,params.ip]
			);
		} catch (error) {
			console.warn(error);
			return null;
		}
	}

	async getMessages(userId, toUserId){
		try {
			return await this.db.query(
				`SELECT id,from_user_id as fromUserId,to_user_id as toUserId,message,time,date,type,file_format as fileFormat,file_path as filePath FROM messages WHERE
					(from_user_id = ? AND to_user_id = ? )
					OR
					(from_user_id = ? AND to_user_id = ? )	ORDER BY id ASC
				`,
				[userId, toUserId, toUserId, userId]
			);
		} catch (error) {
			console.warn(error);
			return null;
		}
	}

	async mkdirSyncRecursive(directory){
		var dir = directory.replace(/\/$/, '').split('/');
        for (var i = 1; i <= dir.length; i++) {
            var segment = path.basename('uploads') + "/" + dir.slice(0, i).join('/');
            !fs.existsSync(segment) ? fs.mkdirSync(segment) : null ;
        }
	}
}
module.exports = new Helper();
