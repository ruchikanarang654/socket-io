var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mod_request = require('request');
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
var TYPES = require('tedious').TYPES;
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
  var responseMessage;
  console.log('Socket session id', socket.handshake.sessionID);
  // socket.handshake.session.save();

  //Function to retrieve data from Azure db to check login credentials of user
  function GetData(message, cb) {

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
            if (message.usrName && message.pwd)
              var responseMsg = 'Email or password do not match';
            io.to(`${socketId}`).emit('chat message', responseMsg);
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

  function FTAConversation(idOfSession, respMessage) {
    if (responseMessage !== '' && responseMessage !== undefined) {
      responseMessage += ' ' + respMessage;
    }
    else {
      responseMessage = respMessage;
    }

    var config =
      {
        userName: 'FTAbotAdmin',
        password: 'Sipl@4844',
        server: 'ftachatbotserver.database.windows.net',
        options:
          {
            database: 'FTAChatbotDB'
            , encrypt: true
          }
      }
    var connection = new Connection(config);

    connection.on('connect', function (err) {
      if (err) {
        console.log(err)
      }
      else {
        queryMOFDatabase()
      }
    }
    );
    function queryMOFDatabase() {
      console.log('One');
      request = new Request('sp_InsertUpdateFTAConversation', function (err) {
        if (err) {
          console.log(err)
        }
        connection.close();
      });

      request.addParameter('SessionId', TYPES.VarChar, idOfSession);
      request.addParameter('UserId', TYPES.VarChar, '');
      request.addParameter('Conversation', TYPES.VarChar, responseMessage);
      request.addOutputParameter('IsSuccess', TYPES.Bit);
      request.on('returnValue', function (paramName, value, metadata) {
        console.log(paramName + ' : ' + value);
      });
      // request.on('row', function (columns) {
      //   //console.log(columns.value);
      //   columns.forEach(function (column) {
      //     console.log("%s", column.value);
      //   });
      // });
      connection.callProcedure(request);
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
          var responseMsg = 'Email or password do not match';
          io.to(`${socketId}`).emit('chat message', responseMsg);
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
      if (body.queryResult.action !== undefined && body.queryResult.action !== 'input.welcome' && body.queryResult.action !== 'input.unknown') {
        console.log("Action present", body.queryResult);
        // console.log("Action present", body.queryResult.fulfillmentMessages);
        io.to(`${socketId}`).emit('chat message', body.queryResult);
      }

      else if (body.queryResult.intent.displayName === 'Login_Intent') {
        console.log('Login Intent');
        if (isLoggedin) {
          io.to(`${socketId}`).emit('chat message', body.queryResult);
        }
        else {
          // FTAConversation(socket.handshake.sessionID, body.queryResult.queryText);
          io.to(`${socketId}`).emit('chat message', body.queryResult);
        }
      }

      else if (body.queryResult.intent.displayName === 'Login_Successful_Intent') {
        console.log('Login Successful Intent');
        // FTAConversation(socket.handshake.sessionID, body.queryResult.fulfillmentText);
        io.to(`${socketId}`).emit('chat message', body.queryResult);
        if (body.queryResult.fulfillmentMessages[2].platform === 'ACTIONS_ON_GOOGLE') {
          console.log('Login successful intent- suggestion')
          // FTAConversation(socket.handshake.sessionID, body.queryResult.fulfillmentMessages[2].suggestions.suggestions[0].title);
          io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[2].suggestions);
        }
      }
      else if (body.queryResult.intent.displayName === 'Total_Number_VAT_Users_Intent') {
        console.log('VAT users');
        if (isLoggedin) {
          // io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0].text.text[0]);
          // FTAConversation(socket.handshake.sessionID, body.queryResult.fulfillmentMessages[0].text.text[0]);
          io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
        }
        else {
          body.queryResult.fulfillmentMessages[0].text.text[0] = 'You are not logged in. Please login to get the details.';
          //io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0].text.text[0]);
          // FTAConversation(socket.handshake.sessionID, body.queryResult.fulfillmentMessages[0].text.text[0]);
          io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
        }
      }
      else {
        if (body.queryResult.fulfillmentMessages[0].platform !== 'ACTIONS_ON_GOOGLE') {
          //console.log('Platform not', body.queryResult.fulfillmentText)
          // FTAConversation(socket.handshake.sessionID, body.queryResult.fulfillmentText);
          io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentText);
        }

        else {
          //List template
          if (body.queryResult.fulfillmentMessages[0].listSelect !== undefined || body.queryResult.fulfillmentMessages[1].listSelect !== undefined) {
            if (body.queryResult.fulfillmentMessages[0].simpleResponses !== undefined) {
              console.log('List Response');
              // FTAConversation(socket.handshake.sessionID, body.queryResult.fulfillmentMessages[0].simpleResponses.simpleResponses[0].textToSpeech);
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
              body.queryResult.fulfillmentMessages[2].listSelect.items.map(function (item) {
                // FTAConversation(socket.handshake.sessionID, item.info.key);
              })
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[2]);
            }
            else {
              console.log('List Response');
              // FTAConversation(socket.handshake.sessionID, body.queryResult.fulfillmentMessages[0].listSelect.title);
              body.queryResult.fulfillmentMessages[0].listSelect.items.map(function (item) {
                // FTAConversation(socket.handshake.sessionID, item.info.key);
              })
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
            }
          }
          //Suggestion chips and basic card with suggestion chips
          else if (body.queryResult.fulfillmentMessages[0].suggestions !== undefined || body.queryResult.fulfillmentMessages[1].suggestions !== undefined) {
            if (body.queryResult.fulfillmentMessages[0].simpleResponses !== undefined) {
              console.log('Suggestion chips');
              // FTAConversation(socket.handshake.sessionID, body.queryResult.fulfillmentMessages[0].simpleResponses.simpleResponses[0].textToSpeech);
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
              body.queryResult.fulfillmentMessages[1].suggestions.suggestions.map(function (items) {
                // FTAConversation(socket.handshake.sessionID, items.title);
              })
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[1].suggestions);
            }
            else {
              //console.log('Only quick replies');
              if (body.queryResult.fulfillmentMessages[0].basicCard !== undefined) {
                console.log('Basic card present with suggestions');
                io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
                body.queryResult.fulfillmentMessages[1].suggestions.suggestions.map(function (items) {
                  // FTAConversation(socket.handshake.sessionID, items.title);
                })
                io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[1].suggestions);
              }
            }
          }
          else if (body.queryResult.fulfillmentMessages[0].simpleResponses !== undefined) {
            console.log('Simple response');
            // FTAConversation(socket.handshake.sessionID, body.queryResult.fulfillmentMessages[0].simpleResponses.simpleResponses[0].textToSpeech);
            io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[0]);
            if (body.queryResult.fulfillmentMessages[1].linkOutSuggestion !== undefined) {
              console.log('Link out messages', body.queryResult.fulfillmentMessages[1].linkOutSuggestion);
              // FTAConversation(socket.handshake.sessionID, body.queryResult.fulfillmentMessages[1].linkOutSuggestion.destinationName);
              // FTAConversation(socket.handshake.sessionID, body.queryResult.fulfillmentMessages[1].linkOutSuggestion.uri);
              io.to(`${socketId}`).emit('chat message', body.queryResult.fulfillmentMessages[1]);
            }
          }
          //Simple response
          else {
            // FTAConversation(socket.handshake.sessionID, 'Something went wrong');
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
        if (typeof (msg) !== 'object') {
          // FTAConversation(socket.handshake.sessionID, msg);
        }
        io.to(`${socketId}`).emit('chat message', msg);
      }
    }
  })
})

http.listen(port, function () {
  console.log('listening on *:', port);
});

