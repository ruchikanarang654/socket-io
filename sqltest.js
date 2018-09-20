// var Connection = require('tedious').Connection;
// var Request = require('tedious').Request;

// // Create connection to database
// var config = 
//    {
//      userName: 'fta', // update me
//      password: 'sipl2017@sipl', // update me
//      server: 'ftaserver.database.windows.net', // update me
//      options: 
//         {
//            database: 'ISSIT' //update me
//            , encrypt: true
//         }
//    }
// var connection = new Connection(config);

// // Attempt to connect and execute queries if connection goes through
// connection.on('connect', function(err) 
//    {
//      if (err) 
//        {
//           console.log(err)
//        }
//     else
//        {
//            queryDatabase()
//        }
//    }
//  );

// function queryDatabase()
//    { console.log('Reading rows from the Table...');
//    var sql =  "select count(*) from cms_user where UserGuid in (select UserGuid from MOF_vatregistrationType)";
//    console.log('query', sql);
//        // Read all rows from table
//      request = new Request(sql
//          ,
//              function(err, rowCount, rows) 
//                 {
//                     if(err){
//                         console.log('Error', err);
//                     }
//                     console.log(rowCount + ' row(s) returned');
//                     //process.exit();
//                 }
//             );
            
//      request.on('row', function(columns) {
//         columns.forEach(function(column) {
//             console.log("%s",  column.value);
//          });
//              });
//      connection.execSql(request);
//    }

var dateTime = require('node-datetime');
var date = dateTime.create();
var LocalStorage = require('node-localstorage').LocalStorage,
  localStorage = new LocalStorage('./scratch');
var time_now = date.now();
console.log('Date now', time_now);
console.log('Type of date.now', typeof(time_now));
console.log('Local storage', localStorage.getItem('time'));
console.log('Local storage type', typeof(parseInt(localStorage.getItem('time'))));

console.log('bool', parseInt(localStorage.getItem('time'))<time_now);
