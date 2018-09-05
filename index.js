var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');
var port = process.env.PORT || 3000;

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
  socket.on('chat message', function (msg) {
    console.log('message: ' + msg);
    var inputbody = { "query_input": { "text": { "text": msg, "language_code": "en" } } }

    var headers = {
      //'Authorization': 'Bearer ' + inputs.token,
      'Authorization': 'Bearer ya29.GlwPBooNNPBrY5P84ztDC0dnHLFdmg16_qDcU_RkaxS5KOtsJQXXL7CgCkT9B5TU7HPspG417sTDJBq-5UQq3qwpi6xXVH4-kSuQhfKvBuynNBd-WxzWX3AUAd4dWQ',
      'Content-Type': 'application/json; charset=utf-8'
    }
    console.log('request-headers', headers);
    var options = {
      // url: 'https://dialogflow.googleapis.com/v2/',
      url: 'https://dialogflow.googleapis.com/v2/projects/newagent-148ea/agent/sessions/123456789:detectIntent',
      method: 'POST',
      headers: headers,
      json: inputbody
    }

    request(options, function (error, response, body) {

      if (!error && response.statusCode === 200) {
        console.log(body) // Print the json response
        io.emit('chat message', body.queryResult.fulfillmentText);
      }
    })
    io.emit('chat message', msg);
    //   socket.emit
  });
});

//   io.on('connection', function(socket){
//     console.log('a user connected');
//     socket.on('disconnect', function(){
//         console.log('user disconnected');
//     })
//   });

http.listen(port, function () {
  console.log('listening on *:', port);
});


