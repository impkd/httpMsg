var express = require('express');
var router = express.Router();

var httpMsg = require('../lib/httpMsg');
var httpMsgInstance = httpMsg.createInstance(
    function(error, resOfSender){
        if(resOfSender._headerSent) return;  // response has ended;
        if(error){
            resOfSender.status(400).send(error);
            return;
        }
        resOfSender.status(200).send('send success!');
    },
    function(error, messageArray, resOfReceiver){
        if(resOfReceiver._headerSent) return;  // response has ended;
        if(error){
            resOfReceiver.status(400).send(error);
            return;
        }
        resOfReceiver.status(200).json(messageArray);
    }
);
if(!httpMsgInstance) console.log('httpMsg.createInstance fail!');

router.post('/sendMessage', function(req, res, next) {
    var uid = req.body.uid;
    var device = req.body.device;
    var toUid = req.body.toUid;
    var toDevice = req.body.toDevice;
    var message = req.body.message;

    // TODO : identify the user
    httpMsgInstance.sendMsg(uid, device, message, toUid, toDevice, res);
});

router.post('/receiveMessage', function(req, res, next) {
    var uid = req.body.uid;
    var device = req.body.device;

    // TODO : identify the user
    httpMsgInstance.receiveMsg(uid, device, res);
});

router.post('/getUserDevices', function(req, res, next) {
    var uid = req.body.uid;

    // TODO : identify the user
    httpMsgInstance.getUserDevice(uid, function (deviceArray) {
        res.status(200).json(deviceArray);
    });
});

module.exports = router;
