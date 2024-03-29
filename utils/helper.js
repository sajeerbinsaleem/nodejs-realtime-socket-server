'user strict';

const DB = require('./db');
const path = require('path');
const fs = require('fs');
const firebase = require('./push');

class Helper{

	constructor(app){
		this.db = DB;
		this.firebase = firebase;
	}

	async addSocketId(userId, userSocketId){
		console.log('userSocketId',userSocketId)
		try {
			var current_date = new Date();
			await this.db.query(`UPDATE users SET socket_id = ?, online= ?, updated_at = ? WHERE id = ?`, [userSocketId,1,current_date, userId]);
			// return onlineFlag;
			return await this.db.query('INSERT INTO socket_users (`user_id`, `socket_id`) VALUES (?, ?)', [userId, userSocketId])
			
		} catch (error) {
			console.log(error);
			return null;
		}
	}

	async logoutUser(userSocketId){
		var current_date = new Date();
		var onlineFlag = await this.db.query(`UPDATE users SET socket_id = ?, online= ?, updated_at = ? WHERE socket_id = ?`, ['',0, current_date, userSocketId]);
		// return onlineFlag;

		return await this.db.query(`DELETE from socket_users WHERE socket_id = ?`, [userSocketId]);
	}

	getChatList(query){
		try {
			return Promise.all([
				this.db.query(query)
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
			if(params.tenant_slug){
				var firebase_server_key = await this.getFirebaseServerKey(params.tenant_slug,params.toUserId);

				var firebase_uuid = await this.getFirebaseUid(params.tenant_slug, params.toUserId);
	
				if(firebase_server_key != null && firebase_uuid != null ){
					this.firebase.pushMessage(params.message, firebase_server_key, firebase_uuid);
				}
			}
        	

			var current_date = new Date();
			
			return await this.db.query("INSERT INTO messages (`type`, `file_format`, `file_path`, `from_user_id`,`to_user_id`,`message`, `date`, `time`, `ip`, `created_at`) values (?,?,?,?,?,?,?,?,?,?)", [params.type, params.fileFormat, params.filePath, params.fromUserId, params.toUserId, params.message, params.date, params.time,params.ip,current_date]
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

	async getNotification(userId, tenatId, slug){

		if(slug){
			try {
				var notificationCount = await this.db.query(
					`SELECT COUNT(data) as count
						FROM logezy_${slug}.notifications WHERE notifiable_id = ?;
					`,
					[userId]
				);
			  return notificationCount[0];
			} catch (error) {
				console.warn(error);
				return null;
			}
		}

		return null;
	}

	async getUnreadMsgCount(userId){
		try {
			const count = await this.db.query(`SELECT count(*) as unreadCount from messages where is_read = 0 AND to_user_id = ?`, [userId]);
			return count[0];
		} catch (error) {
			console.warn(error);
			return null;
		}
	}

	async readMessages(fromUserId, toUserId){
		try {
			const read = await this.db.query(`UPDATE messages SET  is_read = 1 WHERE from_user_id = ? AND to_user_id = ?`, [fromUserId, toUserId]);
			return read[0];
		} catch (error) {
			console.warn(error);
			return null;
		}
	}

	async getFirebaseServerKey(slug){

		var slug = slug;
		try {


			var firebase_server_key = await this.db.query(
				
				`SELECT settings_value FROM logezy_${slug}.agency_settings WHERE settings_key='firebase_server_key' LIMIT 1`,
			);
        	 return firebase_server_key[0].settings_value;

		} catch (error) {
			console.warn(error);
			return null;
		}
	}
	async getFirebaseUid(slug, userId){
		var slug = slug;
		var userId = userId;

		try {
			var firebase_uuid =  await this.db.query(
				`SELECT firebase_uin FROM logezy_${slug}.candidates WHERE user_id = ?`, [userId]
			);
			return firebase_uuid[0].firebase_uin;

		} catch (error) {
			console.warn(error);
			return null;
		}
	}

	/**
	 * 
	 * @param { tenant id} tenantId 
	 */
	async getAdminByTenant(slug,tenantId){
		try {
			var users =  await this.db.query(
				`SELECT distinct u.id,u.name, su.socket_id FROM users u left join user_tenants ut on u.id = ut.user_id
				left join logezy_${slug}.role_users ru on u.id = ru.user_id
				left join logezy_${slug}.roles r on ru.role_id = r.id
				left join socket_users su on u.id = su.user_id
				where ut.tenant_id = ${tenantId} and r.name = 'manager' and su.socket_id != null`
			);
		console.log('users',users)
		return users;
		
		} catch (error) {
			console.warn(error);
			return null;
		}
	}

	async getSocketId(userId){
		try {
			return await this.db.query(
				`SELECT * from socket_users WHERE user_id = ?`, [userId]
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
