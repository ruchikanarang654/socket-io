var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mod_request= require('request');
var port = process.env.PORT || 3000;
var qs = require("querystring");
var http_request = require("https");
var LocalStorage = require('node-localstorage').LocalStorage,
  localStorage = new LocalStorage('./scratch');
var dateTime = require('node-datetime');
var date = dateTime.create();
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var session = require('express-session');
// var TYPES = require('tedious').TYPES;
var session = require("express-session")({
  secret: "my-secret",
  resave: true,
  saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");

app.use(session);

app.get('/', function (req, res) {
  console.log('Request session id', req.sessionID);
  res.sendFile(__dirname + '/index.html');
});

io.use(sharedsession(session)); 

io.on('connection', function (socket) {
  var isLoggedin;
  console.log('Socket session id', socket.handshake.sessionID);
  // socket.handshake.session.save();

  //Function to retrieve data from Azure db to check login credentials of user
  function GetData(message, cb){

    var config =
                {
                    userName: 'SystematixBOT', 
                    password: 'SiplBOT@4844', 
                    server: 'systematixbotserver.database.windows.net', 
                    options:
                        {
                            database: 'HRBot' 
                            , encrypt: true
                        }
                }
            var connection = new Connection(config);

            connection.on('connect', function (err) {
                if (err) {
                    console.log(err)
                }
                else {
                    queryDatabase()
                }
            }
            );
    
            function queryDatabase() {
                var sql = "select * from EmployeeDetail where EmployeeEmail='" + message.usrName + "' and Password='" + message.pwd + "'";
                // Read all rows from table
                request = new Request(sql,
                    function (err, rowCount, rows) {
                        if (rowCount === 1) {
                            cb(rowCount);
                        }
                        else {
                          if(message.usrName && message.pwd)
                          io.to(`${socketId}`).emit('chat message', 'Email or password do not match.');
                        }
                    }
                );
                //Retrieve required data from table
                request.on('row', function (columns) {
                    columns.forEach(function (column) {
                        console.log("%s", column.value);
                    });
                });
                connection.execSql(request);
            }
    }
    //Gets the value of socket if
  var socketId = socket.id;

  socket.on('chat message', function (msg) {
    var inputbody;
    inputbody = { "query_input": { "text": { "text": msg, "language_code": "en" } } }
    var access_token = '';

    if (typeof (msg) === 'object') {
      GetData(msg, function (count) {
        if (count === 1) {
          io.to(`${socketId}`).emit('chat message', 'Login successful');
          isLoggedin = true;
        }
        else {
          io.to(`${socketId}`).emit('chat message', 'Email or password do not match');
        }

      })
    }

    //Function to generate access token from refresh token.
    function GenerateAccessToken() {
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

      return new Promise(function (resolve) {
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
            resolve(access_token);
          })
        })
        //MOF bot credentials
        req.write(qs.stringify({
          client_id: '511205949612-94nc5ffbmftoupqrqqdnd890b90svdn5.apps.googleusercontent.com',
          client_secret: 'dGI0zbHYuBpJSTYMu2ofK83U',
          refresh_token: '1/em5fy9zMY0N_pT5XhO8R_9UlN9DcZmD8TQFgkrDP_o8',
          grant_type: 'refresh_token'
        }));
        //Knowledge-Bot credentials(for testing)
        // req.write(qs.stringify({
        //   client_id: '1090976722360-dqeht8g2qib1kp846tg7b72m8qt9bh5k.apps.googleusercontent.com',
        //   client_secret: 'pGy96K3-kNHM0ZFfu2h_dxTc',
        //   refresh_token: '1/8wS4rJrf_PHfP449UwfMvAOzhYtXWNcbNCbU2zGTFG4',
        //   grant_type: 'refresh_token'
        // }));
        req.end();
      })
    }

    //Function sends request to Dialogflow and returns the response body of Dialogflow.
    function RequestDialogflow(token) {
      var headers = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json; charset=utf-8'
      }

      var options = {
        url: 'https://dialogflow.googleapis.com/v2/projects/ftabuddy/agent/sessions/' + socket.handshake.sessionID + ':detectIntent',
        //url: 'https://dialogflow.googleapis.com/v2/projects/newagent-148ea/agent/sessions/123456789:detectIntent',
        method: 'POST',
        headers: headers,
        json: inputbody
      }

      return new Promise(function (resolve) {
        mod_request(options, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            resolve(body);
          }
        })
      })
    }

    //Function which takes input as the response body generated from Request sent to Dialogflow and sends the final message to socket
    function ResponseToDialogflow(body) {
      if (body.queryResult.intent.displayName === 'Login_Intent') {
        console.log('Login Intent');
        io.to(`${socketId}`).emit('chat message', body.queryResult);
      }
      else if (body.queryResult.intent.displayName === 'Login_Successful_Intent') {
        console.log('Login Successful Intent');
        io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentText);
        if (body.queryResult.fulfillmentMessages[2].platform === 'ACTIONS_ON_GOOGLE') {
          console.log('Login successful intent- suggestion')
          io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[2].suggestions);
        }
      }
      else if (body.queryResult.intent.displayName === 'Total_Number_VAT_Users_Intent') {
        console.log('VAT users');
        if (isLoggedin) {
          io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0].text.text[0]);
        }
        else {
          body.queryResult.fulfillmentMessages[0].text.text[0] = 'You are not logged in. Please login to get the details.';
          io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0].text.text[0]);
        }
      }
      else {
        if (body.queryResult.fulfillmentMessages[0].platform !== 'ACTIONS_ON_GOOGLE') {
          //console.log('Platform not', body.queryResult.fulfillmentText)
          io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentText);
        }

        else {
          //List template
          if (body.queryResult.fulfillmentMessages[0].listSelect !== undefined || body.queryResult.fulfillmentMessages[1].listSelect !== undefined) {
            if (body.queryResult.fulfillmentMessages[0].simpleResponses !== undefined) {
              console.log('List Response');
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[2]);
            }
            else {
              console.log('List Response');
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
            }
          }
          //Suggestion chips and basic card with suggestion chips
          else if (body.queryResult.fulfillmentMessages[0].suggestions !== undefined || body.queryResult.fulfillmentMessages[1].suggestions !== undefined) {
            if (body.queryResult.fulfillmentMessages[0].simpleResponses !== undefined) {
              console.log('Suggestion chips');
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[1].suggestions);
            }
            else {
              //console.log('Only quick replies');
              if (body.queryResult.fulfillmentMessages[0].basicCard !== undefined) {
                console.log('Basic card present with suggestions');
                io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
                io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[1].suggestions);
              }
            }
          }
          else if (body.queryResult.fulfillmentMessages[0].simpleResponses !== undefined) {
            console.log('Simple response');
            if (body.queryResult.fulfillmentMessages[1] !== undefined) {
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
              //console.log('Link out messages', body.queryResult.fulfillmentMessages[1]);
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[1]);
            }
            else {
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
            }
          }
          //Simple response
          else {
            io.to(`${socketId}`).emit('chat message', 'Something went wrong');
          }
        }
      }
    }

    if (!localStorage.getItem('token') || (!localStorage.getItem('time'))) {
      console.log('if');
      var dataPromise = GenerateAccessToken();
      dataPromise
        .then(function (result) {
          var token_val = result;
          localStorage.setItem('time', date.now());
          localStorage.setItem('token', token_val);
          console.log(localStorage.getItem('token'));
          var anotherPromise = RequestDialogflow(token_val)
          anotherPromise.then(function (response_body) {
            ResponseToDialogflow(response_body);
            return response_body;
          })
        })
    }
    else {
      console.log('else');
      var diff = date.now() - parseInt(localStorage.getItem('time'));
      console.log(diff);
      if (diff > 3500000) {
        console.log('else-if');
        var dataPromise = GenerateAccessToken();
        dataPromise
          .then(function (result) {
            //console.log(result);
            var token_val = result;
            localStorage.setItem('time', date.now());
            localStorage.setItem('token', token_val);
            console.log('Value of token', localStorage.getItem('token'));
            var anotherPromise = RequestDialogflow(token_val)
            anotherPromise.then(function (response_body) {
              ResponseToDialogflow(response_body);
              return response_body;
            })
          })
      }
      else {
        var token = localStorage.getItem('token');
        console.log('Value of token', token);
        var anotherPromise = RequestDialogflow(token)
        //console.log(anotherPromise);
        anotherPromise.then(function (response_body) {
          ResponseToDialogflow(response_body);
          return response_body;
        })
      }
      if (msg !== 'Login successful') {
        io.to(`${socketId}`).emit('chat message', msg);
      }
    }
  })
})

http.listen(port, function () {
  console.log('listening on *:', port);
});

