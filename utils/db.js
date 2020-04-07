'use strict';

const mysql = require('mysql');
// const dotenv = require('dotenv');
// dotenv.config();

class Db {
	constructor() {
		this.connection = this.connectDB();
	}
	connectDB() {
		return mysql.createPool({
			connectionLimit: 100,
			host: process.env.DBHost,
			user: process.env.DBUser,
			password: process.env.DBPassword,
			database: process.env.Database,
			debug: false
		});
	}
	query(sql, args) {
		this.connection = this.connectDB();
		return new Promise((resolve, reject) => {
			this.connection.query(sql, args, (err, rows) => {
				if (err)
					return reject(err);
				this.close();
				resolve(rows);
			});
		});
	}
	close() {
		return new Promise((resolve, reject) => {
			this.connection.end(err => {
				if (err)
					return reject(err);
				resolve();
			});
		});
	}
}
module.exports = new Db();
