var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');
var port = process.env.PORT || 3000;

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
  var socketId = socket.id;
  socket.on('chat message', function (msg) {
    console.log('socket id:'+ socket.id);
    console.log('message: ' + msg);
    var inputbody = { "query_input": { "text": { "text": msg, "language_code": "en" } } }

    var headers = {
      //'Authorization': 'Bearer ' + inputs.token,
      'Authorization': 'Bearer ya29.GlwUBmpqZH3wb7kMhQ3A0s_2iD2cJfAD_DQ1T_ksTR1niwarh640fpkksGUde_5vaUIfKDFoEke6ZEjHOszuysl16vTJoiUEJj0v9lY8YPrhxvwHtgZv3hpDtnC5qg',
      'Content-Type': 'application/json; charset=utf-8'
    }

    var options = {
      // url: 'https://dialogflow.googleapis.com/v2/',
      url: 'https://dialogflow.googleapis.com/v2/projects/newagent-148ea/agent/sessions/123456789:detectIntent',
      method: 'POST',
      headers: headers,
      json: inputbody
    }

    request(options, function (error, response, body) {

      if (!error && response.statusCode === 200) {
        io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentText);
        //io.emit('chat message', body.queryResult.fulfillmentText);
      }
    })
    io.to(`${socketId}`).emit('chat message', msg);
    //io.emit('chat message', msg);
    //   socket.emit
  });
});


http.listen(port, function () {
  console.log('listening on *:', port);
});


