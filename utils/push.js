
const admin = require("firebase-admin");
const DB = require('./db');
const http = require('http');

  
   const options = {
    priority: "high",
    timeToLive: 60 * 60 *24
  };



  

  'use strict';

// const dotenv = require('dotenv');
// dotenv.config();

class Push {
  
  constructor(app){
    this.tenent_id = 1;
    // this.firebase = firebase;
  }

  pushMessage(message, server_key, token) {

    const request = require('request-promise');
    const options = {
        method: 'POST',
        uri: 'https://fcm.googleapis.com/fcm/send',
        body: {
          notification: {
                title: "You have a new message",
                body: message,
                collapse_key: "Updates Available",
                sound: "default"
          },
          to : token
        },
        json: true,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'key= '+server_key
        }
    }

    request(options).then(function (response){
        // res.status(200).json(response);
        console.log(response.data);
    })
    .catch(function (err) {
        console.log(err);
    })

  }
  
}
module.exports = new Push();
