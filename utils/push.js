
const admin = require("firebase-admin");
const DB = require('./db');
const http = require('http');

'use strict';

class Push {
  
  constructor(app){

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
