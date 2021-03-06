'use strict';

const utils = require("../../utils.js");
const g_constants = require("../../constants.js");
const WebSocket = require('ws');

let chat = [];

exports.onNewMessage = function(ws, req, messageObject)
{
    utils.GetSessionStatus(req, status => {
        if (!status.active)
            return;
        
        if (messageObject.text.length == 0)
            return;
        if (messageObject.text.length >100)
            messageObject.text = messageObject.text.substr(0, 100);
            
        const msg = {user: status.user, userID: status.id, message: messageObject};    
        
        SaveMessage(msg);
        
        //ws.send(JSON.stringify({request: 'chat-message', message: msg}))

        // Broadcast to everyone else.
        g_constants.WEB_SOCKETS.clients.forEach( client => {
            if (client.readyState === WebSocket.OPEN) 
                client.send(JSON.stringify({request: 'chat-message', message: msg}));
        });
    });
}

exports.onRequestMessages = function(ws)
{
    GetLastMessages(messages => {
        ws.send(JSON.stringify({request: 'chat-messages', message: messages}));
    });
}

function GetLastMessages(callback)
{
    if (chat.length)
    {
        callback(chat);
        return;
    }
        
    g_constants.dbTables['KeyValue'].get('chat', (err, value) => {
        try { chat = JSON.parse(value) } catch(e) {}
        callback(chat);
    });
}

function SaveMessage(msg)
{
    chat.push(msg);
    
    var tmp = (chat.length > 500) ? chat.slice(chat.length-500) : chat;
    chat = tmp;
    
    setTimeout(SaveToDB, 30000);
}

function SaveToDB()
{
    g_constants.dbTables['KeyValue'].set('chat', JSON.stringify(chat))
}