#!/usr/bin/env node

/**
 * Module dependencies.
 */

var express = require('express');
var debug = require('debug')('middleware:server');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var http = require('http');
const net = require("net");

// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');
const mongooseDB = require('mongoose');

const useMongo = require('./modelProxy')
mongooseDB.connect('mongodb://localhost:27017/proxy',
  {
    useNewUrlParser: true
  }
);

var app = express();
const _server = http.createServer(app);
const port = 80;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
//app.use('/users', usersRouter);

// catch 404 and forward to error handler
// app.use(function (req, res, next) {
//   next(createError(404));
// });

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

createServerDamon();
app.listen(port, () => {
  console.log(`Server is running on port ${port}.`);
})
function createServerDamon() {
  useMongo.find({}, function (err, docs) {
    if (err) {
      res.json(err);
    }
    else {
      // console.log("First function call : ", docs);
      listProxy(docs)
    }
  });
}
app.get('/',function(req,res){
  useMongo.find({}, function (err, docs) {
    if (err) {
      res.json(err);
    }
    else {
      // console.log("First function call : ", docs);
      Posts = "Server Proxy Info";
      userPosts = [];
      for (let i = 0; i < docs.length; i++) {
        let serverIp = docs[i]['currentIp'];
        let ipAddress = serverIp.split(":").slice(-1)[0];
        let serverAddress = docs[i]['currentIp'] == '::1' ? '192.168.111.133' : ipAddress;
        let serverPort = docs[i]['PORT'];
        let isOnline = false;
        let threads = 0;
        for (let a in socks[serverAddress])
        {
          if (socks[serverAddress][a]['isEnded'] == false)
          {
            isOnline = true;
            if (socks[serverAddress][a]['isconnected'] == true)
              threads++;
          }
        }
        userPosts.push( { 'port':serverPort, 'address':serverAddress
        , 'online':isOnline?'online':'offline'
        , 'threads':threads
        });
      }
      res.render('index', { 'Posts':Posts, 'userPosts':userPosts, 'title':"Dashboard"});
    }
  });
  
})
app.get('/layout',function(req,res){
  res.render('layout');
})
app.get('/error',function(req,res){
  res.render('error');
})
app.post('/api/getnewport', function (req, res) {
  ipAddress = req.ip;
  useMongo.findOne({'currentIp':ipAddress}, {}, { }, 
    async function (err, post) {
    if (post){
      //console.log("found post", post);
      let serverIp = post['currentIp'];
      let ipAddress = serverIp.split(":").slice(-1)[0];
      let serverAddress = post['currentIp'] == '::1' ? '192.168.111.133' : ipAddress;
      let ports = {};
      //console.log(socks);
      //console.log(serverAddress);
      //console.log(socks[serverAddress]);
      for (let port in socks[serverAddress] )
      {
        let d = socks[serverAddress][port];
        if (d['isEnded']) 
          ports[port]  = 'open';
      }
      /*console.log(
        "port is", ports
      )*/
      console.log(" opented pors num is +", Object.keys(ports).length);
      return res.json({'ports':ports});
    }else
    {
      console.log(" post not found!!!!");
      return res.json({});
    }
  });
  
});
let numberOfThread = 100;
app.post('/api/register', function (req, res) {
  console.log(11)
  let lstPort = 8080;
  var id = 0;
  let flag = true;
  useMongo.findOne({}, {}, { sort: { 'PORT': -1 } }, async function (err, post) {
    if (post) {
      lstPort = post['PORT']
    }
    const docs = await useMongo.find({})
    if (docs.filter(cli => cli['currentIp'] == req.ip).length) {
      flag = false;
    }
    if (flag) {
      let currentIp = req.ip;
      //
      let rangeStart = 10000 + ((lstPort - 8080) * numberOfThread); 
      let proxyData = new useMongo({
        'currentIp': req.ip,
        'PORT': lstPort + 1,
        'rangeStart': rangeStart 
      })

      proxyData.save(function (err, result) {
        if (err) {
          return res.json(err);
        }
        else {
          // create server;
          let serverIp = currentIp;
          let ipAddress = serverIp.split(":").slice(-1)[0];
          let serverAddress = ipAddress
          let serverPort = lstPort + 1;
          socks[serverAddress] = {};
          i = docs.length + 1;
          for (let j = 0; j < numberOfThread; j++)
          {
             createForwardServer(serverAddress,rangeStart +  j );
          }
          createServer(serverAddress,serverPort)
          return res.json({ port: lstPort + 1 });
        }
      })
      console.log(`${req.ip} is connected and created`)
    } else {
      console.log(`${req.ip} is connected`)
      var clientNow = docs.filter(cli => cli['currentIp'] == req.ip)
      return res.json({ port: clientNow[0]['PORT'] });
    }
  });
});


function listProxy(clients) {
  for (let i = 0; i < clients.length; i++) {
    let serverIp = clients[i]['currentIp'];
    let ipAddress = serverIp.split(":").slice(-1)[0];
    let serverAddress = clients[i]['currentIp'] == '::1' ? '192.168.111.133' : ipAddress;
    let serverPort = clients[i]['PORT'];
    let rangeStart = clients[i]['rangeStart'];
    socks[serverAddress] = {};
    for (let j = 0; j < numberOfThread; j++)
    {
      createForwardServer(serverAddress,rangeStart + j );
    }
  }
  for (let i = 0; i < clients.length; i++) {
    let serverIp = clients[i]['currentIp'];
    let ipAddress = serverIp.split(":").slice(-1)[0];
    let serverAddress = clients[i]['currentIp'] == '::1' ? '192.168.111.133' : ipAddress;
    let serverPort = clients[i]['PORT'];
    createServer(serverAddress,serverPort);
  }
}
let socks = {
}

function createForwardServer(serverAddress,serverPort)
{
  try{
  const server = net.createServer();
  server.on("connection", (clientToProxySocket) => {
    console.log("Real Client connected to proxy");
    socks[serverAddress][serverPort]['socket'] = clientToProxySocket;
    socks[serverAddress][serverPort]['isconnected'] = true;
    socks[serverAddress][serverPort]['isPipped'] = false;
    socks[serverAddress][serverPort]['isEnded'] = false;
    /*clientToProxySocket.on("error", (err) => {
      console.log("end port");
      console.log(err);
      socks[serverAddress][serverPort]['isEnded'] = true;
    });*/
    clientToProxySocket.on("close" , (data) => {
      //console now
      console.log("end port");
      socks[serverAddress][serverPort]['isEnded'] = true;
    })
    
    clientToProxySocket.on("data" , (data) => {
      //console now
      //console.log("data is -- ", data);
    })
    //console.log(socks);
  });

  server.on("error", (err) => {
    console.log("Some internal server error occurred");
    console.log(err);
  });

  server.on("close", () => {
      console.log("Client disconnected");
  });
  let port = serverPort;
  server.listen(
      {
          host: "0.0.0.0",
          port: port,
      },
      () => {
          console.log("Server listening on 0.0.0.0:" + port);
      }
  );
  socks[serverAddress][serverPort] = {};
  socks[serverAddress][serverPort]['isconnected'] = false;
  socks[serverAddress][serverPort]['isPipped'] = false;
  socks[serverAddress][serverPort]['isEnded'] = true;
    }catch (exception)
    {
      console.log(exception);
    }
}
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
function createServer(serverAddress,serverPort) {
  try{
  const server = net.createServer();
  server.on("connection", (clientToProxySocket) => {
    console.log("Client connected to proxy now make data");
    clientToProxySocket.once("data",async(data) => {
      try {
        
        // forward to server to open
        var r = clientToProxySocket.server._connectionKey;
        port = r.split(":")[2];
        console.log("forward data now", serverAddress, serverPort);
        let proxyToServerSocket;
        let selPort;
        //let proxyToServerSocket = socks[serverAddress]['socket']
        //if (proxyToServerSocket == undefined)
        //{
        //  console.log("couldn't forward now , client not connected");
        //  return;
        //}
        let foundRelax = false;
        //console.log(socks[serverAddress]);
        let numTry = 0;
        while(!foundRelax){
          for (const port in socks[serverAddress])
          {
             let d = socks[serverAddress][port];
             if (d['isconnected'] && !d['isPipped'] && !d['isEnded'] ){
               proxyToServerSocket = socks[serverAddress][port]['socket'];
               selPort = port;
               foundRelax = true;
               break;
             }
          }
          if (!foundRelax){
            console.log("not found waiting!!!");
            await sleep(1000);
            numTry ++;
            if (numTry > 7)
            {
              console.log("suck--- fresh all ---------");
              //fresh all connections this is all fake
              for (const port in socks[serverAddress])
              {
                let d = socks[serverAddress][port];
                //if (d['isEnded'] ){
                  d['socket'] = null;
                  d['isconnected'] = false;
                  d['isPipped'] = true;
                  d['isEnded'] = true;
                //}
              }
              return;
              numTry = 0;
            }
          }
        }

        console.log("pipe unlocked we need to proceed now");
        //console.log(socks[serverAddress]);
        
        /*net.createConnection(
          {
            host: serverAddress,
            port: serverPort,
          },
          () => {
            console.log("Proxy to server set up");
          }
        );*/

        let isTLSConnection = data.toString().indexOf("CONNECT") !== -1;
        //if (isTLSConnection) {
        //  clientToProxySocket.write("HTTP/1.1 200 OK\r\n\r\n");
        //}else{
          /*proxyToServerSocket.write(data);
          proxyToServerSocket.once("data", (data) => {
            console.log("return data");
            //console.log(data.toString());
            clientToProxySocket.write(data);
            clientToProxySocket.end();
            proxyToServerSocket.end();
          });
          proxyToServerSocket.once("close" , (data) => {
            //console now
            console.log("close now!!!!! restart new connection");
            clientToProxySocket.end();
            proxyToServerSocket.end();
          })
          */
        //}
        proxyToServerSocket.write(data);
        
       

        clientToProxySocket.pipe(proxyToServerSocket);
        proxyToServerSocket.pipe(clientToProxySocket);

        socks[serverAddress][selPort]['isPipped'] = true;

      } catch (except) {
        console.log(except);
      }
    });
    clientToProxySocket.on("error", (err) => {
      console.log("Client to proxy error");

      console.log(err)
    });
  });
  server.on("error", (err) => {
    console.log("Some internal server error occurred");
    console.log(err);
  });

  server.on("close", () => {
      console.log("Client disconnected");
  });
  let port = serverPort;
  server.listen(
      {
          host: "0.0.0.0",
          port: port,
      },
      () => {
          console.log("Server listening on 0.0.0.0:" + port);
      }
  );
    }catch(e)
    {
      console.log(e)
    }
}
/**
 * Listen on provided port, on all network interfaces.
 */

// _server.listen(port);
// _server.on('error', onError);
// _server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = _server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
