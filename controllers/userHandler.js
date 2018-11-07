'use strict';

var UserModel = require('../models/user.js');
var Counter = require('../models/counter.js');

var User = UserModel.user;
var Log = UserModel.log;

// regex used for validations
const validName = /^\w+$/; // allow alphanumeric characters only
const invalidChar = /[\<\>\&\'\"\$\%\;]/gi; // unwanted charactors in description
const validDuration = /^\d+$/; // Only numbers
const validDate = /^(?:\d{4}\-\d{2}\-\d{2}){0,1}$/; // nnnn-nn-nn or empty
const validUserId = /^\d+$/; // Only numbers
const validLimit = /^\d+$/; // Only numbers

function getCountAndIncrease (req, res, callback) {
  Counter.findOneAndUpdate({}, {$inc:{'count': 1}}, {new: true}, function(err, data){
    if(err) {
      console.error(err);
      callback(err);
    } else if (data) {
      callback(null, data.count);
    } else {
      var newCounter = new Counter();
      newCounter.save(function(err, data) {
        if(err) {
          console.error(err);
          callback(err);
        } else {
          callback(null, data.count);
        }
      });
    }
  });
}

exports.createAndSaveUser = function(req, res) {
  // The username posted from the form
  var userName = req.body.username;
  
  if (validName.test(userName)) {
    if(userName.length > 32) {
      console.log("user name is too long");
      res.json({"error": "Username is too long"});
    } else {
      // user name is short enough
      
      console.log("user name is valid");
      // returned will be an object with username and _id
      getCountAndIncrease(req, res, function(err, cnt){
        if(err) {
          console.error(err);
          res.json({"error": "Failed to create a new user"});
        } else {
          console.log("NEW COUNT:" + cnt);
          var newUser = new User({
            username: userName,
            _id: cnt
          });
          newUser.save(function(err){
            if(err){
              console.error(err);
              res.json({"error": "could not save the user"});
            } else {
              res.json({
                "username": userName,
                "_id": cnt
              });
            }
          })
        }
      });
    }

  } else {
    console.log("user name is invalid");
    res.json({
      "error": "Username is invalid"
    });
  }
  
}

exports.getUsers = function(req, res) {
  // return an array of all users
  User.find({}, function(err, data) {
  if (err) {
    console.error(err);
    res.json({"error": "could not get users"});
  } else if (data) {
    var newArr = [];
    data.forEach(function(obj){
      let userName = obj['username'];
      let id = obj['_id'];
      newArr.push({username: userName, _id: id});
    });
    res.json(newArr);
  } else {
    // When the data is empty
    console.log("Returned data is empty")
    res.json([]);
  }
  });
}

function createLog (desc, duration, date) {
  
  if (!invalidChar.test(desc) && validDuration.test(duration) && validDate.test(date)) {
    if (desc.length > 140) {
      console.log("Description is too long");
      return new Log();
    }
    
    if (duration.length > 5) {
      console.log("Duration is too long");
      return new Log();
    }
    
    if (date) {
      var dateObj = new Date(date);
    } else {
      var dateObj = new Date(); // current date
    }
    
    if (dateObj.toString() == "Invalid Date") {
      // Date is invalid
      console.log("Date is invalid");
      return new Log();
    } else {
      // All data are valid
      var newLog = new Log({
        description: desc,
        duration: duration,
        date: dateObj
      });
      return newLog;
    }
  } else {
    return new Log();
  }
  
}

exports.addLog = function(req, res) {
  // userId(_id), description, duration, and optionally date
  var userId = req.body.userId;
  var description = req.body.description;
  var duration = req.body.duration;
  var date = req.body.date;
  
  if (validUserId.test(userId)) {
    console.log("user ID is valid");
    
    var newLog = createLog(description, duration, date);

    // Returned will the the user object with also with the exercise fields added
    User.findOne({_id : userId}, function(err, data) {
      if (err) {
        console.error(err);
        res.json({"error": "Could not find the user"});
      } else if (data) {
        // The user was found
        var arr = data.logs;
        arr.push(newLog);
        data.logs = arr;
        data.save(function (err, data) {
          if(err) {
            console.error(err);
            res.json({"error": "Could not save the log"});
          } else {
            console.log("New log is added");
            res.json(data);
          }
        });
      } else {
        // User not found
        res.json({"error": "Could not find the user"});
      }
    });
  } else {
    console.log("user ID is invalid");
    res.json({"error": "User ID is invalid"});
  } 
}

function filterByDate(date, from, to) {
  if (validDate.test(from)) {
    from = new Date(from);
    if (from.toString() == "Invalid Date") {
      from = "";
    }
  } else {
    from = "";
  }
  if (validDate.test(to)) {
    to = new Date(to);
    if (to.toString() == "Invalid Date") {
      to = "";
    }
  } else {
    to = "";
  }
  
  if (from && to) {
    if (date >= from && date <= to){
      return true;
    }
    return false;
  } else if (from) {
    if (date >= from){
      return true;
    }
    return false;
  } else if (to) {
    if (date <= to){
      return true;
    }
    return false;
  } else {
    return true;
  }
}

// Return will be the user object with added array log and count (total exercise count)
exports.getLogs = function(req, res) {
  var userId = req.query.userId;
  var from = req.query.from || "";
  var to = req.query.to || "";
  var limit = req.query.limit;
  
  if(validUserId.test(userId)) {
    // If the given userId is valid
    User.findOne({_id: userId}, function(err, data) {
      if (err) {
        console.error(err);
        res.json({"error": "could not get logs"});
      } else if (data) {
        var allLogs = data.logs;
        var newArr = [];

        if (from || to) {
          newArr = allLogs.filter(function(item) {
            if (item) {
              return filterByDate(item.date, from, to);
            } else {
              // item is null
              return false;
            }
          });
        } else {
          newArr = allLogs;
        }

        if (validLimit.test(limit)) {
          newArr = newArr.slice(0, limit);
        }

        var cnt = newArr.length;
        res.json({
          username: data.username,
          _id: data["_id"],
          count: cnt,
          logs: newArr
        });
      } else {
        // When the data is empty
        console.log("Returned data is empty");
        res.json([]);
      }
    });

  } else {
  // If the given userId is invalid
    console.log("userId is invalid");
    res.json({"error": "userId is invalid"});
  }
  
}
