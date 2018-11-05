'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// userId(_id), description, duration, and optionally date
var logSchema = new Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, required: true}
});

var userSchema = new Schema ({
  username: {type: String, required: true},
  _id: {type: Number, required: true, unique: true},
  logs: [logSchema]
});

exports.log = mongoose.model('log', logSchema);
exports.user = mongoose.model('user', userSchema);
