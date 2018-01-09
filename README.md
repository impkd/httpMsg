# httpMsg

##httpMsg 是干什么的?
httpMsg帮你在标准的HTTP工作模式下，实现客户端和服务端的实时通讯。
每个终端都有两个属性：UID、DEVICE, 同一个用户可以有多个不同的终端。


##工作原理

由终端发起一个用于接收消息的HTTP请求，服务端保持该请求作为长链接。

1> httpMsg负责维护这个连接池，当有消息要发送给该终端时，会通过这个请求返回数据。

2> 当一个接收请求返回后，该终端的身份会被保持一段时间，在些时间内重新发起请求即可。

3> 发送消息给保持状态的终端时，发送请求会被保持住，直到超时或者对应终端重新发起请求。

4> 接收到的消息是一个数组，因为在保持状态下，有可能会有多条消息被发送给该终端。



##使用示例（app.js部分）
```javascript
var express = require('express');
var app = express();

var msg = require('./routes/msg');
app.use('/msg', msg);

```

##使用示例（routes/msg.js）

```javascript

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

```