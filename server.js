const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

var userHandler = require('./controllers/userHandler.js');

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// create a user by posting form data username to /api/exercise/new-user 
app.post('/api/exercise/new-user', userHandler.createAndSaveUser);

// get an array of all users by getting api/exercise/users with the same info as when creating a user
app.get('/api/exercise/users', userHandler.getUsers);

// add an exercise to a user by posting form data to /api/exercise/add.
app.post('/api/exercise/add', userHandler.addLog);

// retrieve a full exercise log of a user by getting /api/exercise/log with a parameter of userId(_id)
// retrieve part of the log of any user by also passing along optional parameters of from & to or limit
app.get('/api/exercise/log', userHandler.getLogs);

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
