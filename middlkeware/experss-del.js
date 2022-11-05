var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const mongooseDB = require('mongoose');
const net = require("net");

const useMongo = require('./modelProxy')
mongooseDB.connect('mongodb://localhost:27017/proxy',
  {
    useNewUrlParser: true
  }
);

var app = express();

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
app.use(function (req, res, next) {
  next(createError(404));
});

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

app.post('/api/register', function (req, res) {
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
      var proxyData = new useMongo({
        'currentIp': req.ip,
        'PORT': lstPort + 1
      })

      proxyData.save(function (err, result) {
        if (err) {
          return res.json(err);
        }
        else {
          // create server;
          let serverIp = currentIp;
          let ipAddress = serverIp.split(":").slice(-1)[0];
          let serverAddress = clients[i]['currentIp'] == '::1' ? '192.168.111.133' : ipAddress;
          let serverPort = lstPort + 1;
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
    createServer(serverAddress,serverPort);
  }
}

function createServer(serverAddress,serverPort) {
  const server = net.createServer();
  server.on("connection", (clientToProxySocket) => {
    console.log("Client connected to proxy");
    clientToProxySocket.once("data", (data) => {
      try {
        // forward to server to open
        var r = clientToProxySocket.server._connectionKey;
        port = r.split(":")[2];
        console.log("forward data now", ipAddress, serverPort);
        let proxyToServerSocket = net.createConnection(
          {
            host: serverAddress,
            port: serverPort,
          },
          () => {
            console.log("Proxy to server set up");
          }
        );
        proxyToServerSocket.write(data);
        proxyToServerSocket.on("error", (err) => {
          console.log("Proxy to server error");
          console.log(err);
        });
        clientToProxySocket.on("error", (err) => {
          console.log("Client to proxy error");
          console.log(err)
        });
        clientToProxySocket.pipe(proxyToServerSocket);
        proxyToServerSocket.pipe(clientToProxySocket);
      } catch (except) {

      }
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
}
module.exports = app;
