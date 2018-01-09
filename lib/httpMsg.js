/**
 * Created by inobaa@qq.com on 2017/3/13.
 *
 * Usage: see /routes/msg.js
 */

var httpMsg = {};

httpMsg.createInstance = function (cbSender, cbReceiver) {
    // cbSender(err, res2sender)
    // cbReceiver(err, msg, res2receiver)
    if (typeof (eval(cbSender)) != "function" || typeof (eval(cbReceiver)) != "function") {
        return null;
    }
    var instance = {dataUid2Dev2Obj:{}};
    instance.cbMsgSent = function(err, res2sender){
        // try{
            cbSender(err, res2sender);
        // }
        // catch (e){console.log(e);}
    };
    instance.cbMsgReceived = function(err, msg, res2receiver){
        // try{
            cbReceiver(err, msg, res2receiver);
        // }
        // catch (e){console.log(e);}
    };
    var onlineUserCount = 0;
    var onlineDeviceCount = 0;

    var TimeoutMsForClientMsg = 15 * 1000;
    var TimeoutMsForClientHold = 15 * 1000;

    var ERR_MSG_REPEAT = 'Connection end! Another client connecting use same uid and device name !';
    var ERR_MSG_CLIENT_OFFLINE = 'User or device offline !';
    var ERR_TIMEOUT = 'timeout';

    instance.getUserDevice = function (uid, callback) {
        var uidStr = '' + uid;
        var devices = [];
        for (var i in instance.dataUid2Dev2Obj[uidStr]) {
            devices.push(i);
        }
        callback(devices);
    };
    instance.receiveMsg = function (uid, device, res) {
        if(!instance.dataUid2Dev2Obj.hasOwnProperty('' + uid)){
            instance.dataUid2Dev2Obj[uid] = {};
        }
        var dataOfUid = instance.dataUid2Dev2Obj[uid];
        if(!dataOfUid.hasOwnProperty(device)){
            dataOfUid[device] = {};
        }
        else if(dataOfUid[device].res){
            var _rsp = dataOfUid[device].res;
            if(!_rsp.httpMsgEnded){
                instance.cbMsgReceived(ERR_MSG_REPEAT, null, _rsp);
                _rsp.httpMsgEnded = true;
            }
            delete dataOfUid[device].res;
        }
        var dataOfDev = dataOfUid[device];
        dataOfDev.timeout = (new Date()).getTime() + TimeoutMsForClientMsg;

        if(dataOfDev.onWaitMsg){
            var toSend = [];
            dataOfDev.onWaitMsg.forEach(function (onWaitMsg) {
                toSend.push(onWaitMsg.msg);
                var sender = onWaitMsg.res;
                if(sender && !sender.httpMsgEnded){
                    instance.cbMsgSent(null, sender);
                    sender.httpMsgEnded = true;
                }
            });
            delete dataOfDev.onWaitMsg;
            if(!res.httpMsgEnded){
                instance.cbMsgReceived(null, toSend, res);
                res.httpMsgEnded = true;
            }
            return true;
        }
        dataOfDev.res = res;
        return true;
    };

    instance._sendMsgTo = function(dataOfUid, device, msg, res){
        if(!dataOfUid.hasOwnProperty(device)){
            return false;
        }
        var dataDev = dataOfUid[device];
        if(!dataDev.res){   //不巧碰上连接刚返回
            if(!dataDev.onWaitMsg) dataDev.onWaitMsg = [];
            dataDev.onWaitMsg.push({msg:msg, res:res});
            return true;
        }
        if(!dataDev.res.httpMsgEnded){
            instance.cbMsgReceived(null, [msg], dataDev.res);
            dataDev.res.httpMsgEnded = true;
        }
        dataDev.timeout = (new Date()).getTime() + TimeoutMsForClientHold;
        delete dataDev.res;

        if(!res.httpMsgEnded){
            instance.cbMsgSent(null, res);
            res.httpMsgEnded = true;
        }
        return true;
    };
    instance.sendMsg = function (uid, dev, content, toUid, toDev, res) {
        var dataUid = instance.dataUid2Dev2Obj['' + uid];
        if(!dataUid){
            if(!res.httpMsgEnded){
                instance.cbMsgSent(ERR_MSG_CLIENT_OFFLINE, res);
                res.httpMsgEnded = true;
            }
            return;
        }
        var sendCount = 0;
        var msg = {uid:uid, device:dev, content:content};
        if(!toDev){
            for(var _dev in dataUid){
                if(instance._sendMsgTo(dataUid, _dev, msg, res)) ++sendCount;
            }
        }
        else{
            if(instance._sendMsgTo(dataUid, toDev, msg, res)) ++sendCount;
        }
        if(!sendCount){
            if(!res.httpMsgEnded){
                instance.cbMsgSent(ERR_MSG_CLIENT_OFFLINE, res);
                res.httpMsgEnded = true;
            }
        }
    };

    instance.checkTimeout = function() {
        var now = (new Date()).getTime();
        var curOnlineUser = 0;
        var curOnlineDev = 0;
        var toDelUid = [];
        for (var uid in instance.dataUid2Dev2Obj){
            ++curOnlineUser;
            var dataUid = instance.dataUid2Dev2Obj[uid];
            var userOnlineDeviceCount = 0;
            var toDelDevice = [];
            for (var device in dataUid){
                var dataDev = dataUid[device];
                if(!dataDev.res && dataDev.timeout < now){   //返回后超过时间没有再连接

                    if(dataDev.onWaitMsg){
                        dataDev.onWaitMsg.forEach(function(onWaitMsg){
                            var waiter = onWaitMsg.res;
                            if(!waiter.httpMsgEnded){
                                instance.cbMsgSent(ERR_TIMEOUT, waiter);
                                waiter.httpMsgEnded = true;
                            }
                        });
                    }
                    toDelDevice.push(device);
                    continue;
                }
                ++userOnlineDeviceCount;
                if(dataDev.timeout > now){
                    continue;
                }
                if(!dataDev.res.httpMsgEnded){
                    instance.cbMsgReceived(null, [], dataDev.res);
                    dataDev.res.httpMsgEnded = true;
                }
                delete dataDev.res;
                dataDev.timeout = now + TimeoutMsForClientHold;
            }
            toDelDevice.forEach(function (device) {
                delete dataUid[device];
            });
            if(userOnlineDeviceCount <= 0){
                toDelUid.push(uid);
            }
            curOnlineDev += userOnlineDeviceCount;
        }
        toDelUid.forEach(function (uid) {
            delete instance.dataUid2Dev2Obj[uid];
        });

        onlineUserCount = curOnlineUser;
        onlineDeviceCount = curOnlineDev;
    };
    instance.onTimer = function () {
        try{
            instance.checkTimeout();
        }
        catch(e){
            console.log(e);
        }
        setTimeout(instance.onTimer, 100);
    };
    setTimeout(instance.onTimer, 100);

    return instance;
};

module.exports = httpMsg;