var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');
var port = process.env.PORT || 3000;
var qs = require("querystring");
var http_request = require("https");
var LocalStorage = require('node-localstorage').LocalStorage,
localStorage = new LocalStorage('./scratch');
var dateTime = require('node-datetime');
var date = dateTime.create();

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
  var socketId = socket.id;

  socket.on('chat message', function (msg) {
    console.log('socket id:' + socket.id);
    console.log('type of message', typeof (msg));
    console.log('Message', msg);
    //io.to(`${socketId}`).emit('chat message', msg);
    var inputbody = { "query_input": { "text": { "text": msg, "language_code": "en" } } }
    var access_token = '';

    //Function to generate access token from refresh token.
    function GenerateAccessToken(cb){
      var options_request = {
        "method": "POST",
        "hostname": "accounts.google.com",
        "port": null,
        "path": "/o/oauth2/token",
        "headers": {
          "content-type": "application/x-www-form-urlencoded",
          "cache-control": "no-cache",
        }
      };
  
      var req = http_request.request(options_request, function (res) {
        var chunks = [];
  
        res.on("data", function (chunk) {
          chunks.push(chunk);
          return chunk;
        });
  
        res.on("end", function () {
          var body = Buffer.concat(chunks);
          var json_body = JSON.parse(body.toString());
          access_token = json_body.access_token;
          console.log('access token ', access_token);
          cb(access_token);
        })
      })
      //MOF bot credentials
      req.write(qs.stringify({
        client_id: '511205949612-94nc5ffbmftoupqrqqdnd890b90svdn5.apps.googleusercontent.com',
        client_secret: 'dGI0zbHYuBpJSTYMu2ofK83U',
        refresh_token: '1/em5fy9zMY0N_pT5XhO8R_9UlN9DcZmD8TQFgkrDP_o8',
        grant_type: 'refresh_token'
      }));
      //Knowledge-Bot credentials
      // req.write(qs.stringify({
      //   client_id: '1090976722360-dqeht8g2qib1kp846tg7b72m8qt9bh5k.apps.googleusercontent.com',
      //   client_secret: 'pGy96K3-kNHM0ZFfu2h_dxTc',
      //   refresh_token: '1/8wS4rJrf_PHfP449UwfMvAOzhYtXWNcbNCbU2zGTFG4',
      //   grant_type: 'refresh_token'
      // }));
      req.end();

    }
    GenerateAccessToken(function(id){
      console.log('Value of id', id);
      if (!localStorage.getItem('token') || (!localStorage.getItem('time'))) {
        console.log('if');
        localStorage.setItem('time', date.now());
        localStorage.setItem('token', id);
        console.log(localStorage.getItem('token'));
        //io.to(`${socketId}`).emit('chat message', localStorage.getItem('token'));
    } 
    else {
        console.log('else');
        var diff = date.now() - localStorage.getItem('time');
        console.log(diff);
        if(diff > 3500000){
            console.log('else-if');
            localStorage.setItem('time', date.now());
            localStorage.setItem('token', id);
            console.log(localStorage.getItem('token'));
            //io.to(`${socketId}`).emit('chat message', localStorage.getItem('token'));
        }
      }
    })
        var headers = {
          'Authorization': 'Bearer ' + localStorage.getItem('token'),
          //'Authorization': 'Bearer ya29.GlwVBnl6y2ipWJMwf1iEsXbzl7gU4QE6x0UEgFm8QJjaSLTAG4Gm4v9oIZAbpki4CC2FYYd-ifRMWehd9MQ3cjVXYsXZdx0i5CkHDPmwfhGwu0nCUbQr-FQoQ9e-vg',
          'Content-Type': 'application/json; charset=utf-8'
        }
        console.log('headers', headers);

        var options = {
          // url: 'https://dialogflow.googleapis.com/v2/',
          url: 'https://dialogflow.googleapis.com/v2/projects/ftabuddy/agent/sessions/123456789:detectIntent',
          //url: 'https://dialogflow.googleapis.com/v2/projects/newagent-148ea/agent/sessions/123456789:detectIntent',
          method: 'POST',
          headers: headers,
          json: inputbody
        }

        request(options, function (error, response, body) {
          //console.log('options', options);
          if (!error && response.statusCode === 200) {
            if (body.queryResult.fulfillmentMessages[0].platform !== 'ACTIONS_ON_GOOGLE') {
              //console.log('Platform not', body.queryResult.fulfillmentText)
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentText);
            }
            else {
              //List template
              if (body.queryResult.fulfillmentMessages[0].listSelect !== undefined || body.queryResult.fulfillmentMessages[1].listSelect !== undefined) {
                if (body.queryResult.fulfillmentMessages[0].simpleResponses !== undefined) {
                  io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0].simpleResponses.simpleResponses[0].textToSpeech);
                  io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[1].listSelect.title);
                  console.log('items list', body.queryResult.fulfillmentMessages[1].listSelect.items);
                  io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[1].listSelect);
                }
                else {
                  io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0].listSelect.title);
                  console.log('items in list', body.queryResult.fulfillmentMessages[0].listSelect.items);
                  io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0].listSelect);
                }
              }
              //Suggestion chips and basic card with suggestion chips
              else if(body.queryResult.fulfillmentMessages[0].suggestions !== undefined || body.queryResult.fulfillmentMessages[1].suggestions !== undefined){
                if(body.queryResult.fulfillmentMessages[0].simpleResponses !== undefined){
                  console.log('Suggestion chips');
                  io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0].simpleResponses.simpleResponses[0].textToSpeech);
                  io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[1].suggestions);
                  //console.log(body.queryResult.fulfillmentMessages[1].suggestions);
                }
                else{
                  console.log('Only quick replies');
                  if(body.queryResult.fulfillmentMessages[0].basicCard !== undefined){
                    console.log('Basic card present');
                    console.log('basic card result', body.queryResult.fulfillmentMessages[0])
                    io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
                    io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[1].suggestions);
                  }   
                }
              }
              else if(body.queryResult.fulfillmentMessages[0].simpleResponses !== undefined){
                  console.log('Simple response');                 
                  // io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0].simpleResponses.simpleResponses[0].textToSpeech);
                  if(body.queryResult.fulfillmentMessages[1] !== undefined){
                    io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0].simpleResponses.simpleResponses[0].textToSpeech);
                    console.log('Link out messages', body.queryResult.fulfillmentMessages[1]);
                    io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[1]);
                  }
                  else{
                    io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0].simpleResponses.simpleResponses[0].textToSpeech);
                  }
              }
              else if(body.queryResult.fulfillmentMessages[0].basicCard !== undefined){
                console.log('Basic card');
              }
              //Simple response
              else {
                io.to(`${socketId}`).emit('chat message', 'Something went wrong');
              }
            }
          }
          else {
            console.log('Error', error);
            console.log('Response code', response.statusCode);
          }
        })
        io.to(`${socketId}`).emit('chat message', msg);
      });

    })

http.listen(port, function () {
  console.log('listening on *:', port);
});


