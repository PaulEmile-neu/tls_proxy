const net = require("net");
const fs = require("fs");

const server = net.createServer();
const LISTENING_PORT = 8199;
const HTTPS_PORT = 443;

const options = {
  key: fs.readFileSync('certificates/server-key.pem'), 
  cert: fs.readFileSync('certificates/server-crt.pem'), 
  ca: fs.readFileSync('certificates/ca-crt.pem'), 
  requestCert: true, 
  rejectUnauthorized: true
};

server.on("connection", (ClientSocket) => {
  // We need only the data once, the starting packet
  ClientSocket.once("data", (data) => {
    //log all the data to a file
    fs.appendFile("log.txt", data.toString(), (err) => {
      if (err) {
        console.error(err);
        return;
      }
      //file written successfully
    });

    //check TLS connection
    let isTLSConnection = data.toString().indexOf("CONNECT") !== -1;

    // By Default port is 80
    let baseServerAddress;
    if (isTLSConnection) {
      // Port changed if connection is TLS
      baseServerAddress = data
        .toString()
        .split("CONNECT ")[1]
        .split(" ")[0]
        .split(":")[0];
    } else {
      baseServerAddress = data.toString().split("Host: ")[1].split("\r\n")[0];
    }

    console.log(data.toString());

    let serverSocket = net.createConnection(
      {
        host: baseServerAddress,
        port: HTTPS_PORT,
      },
      () => {
        if (isTLSConnection) {
          //if the connexion is made using the tls protocol
          ClientSocket.write("HTTP/1.1 200 OK\r\n\n");
        } else {
            serverSocket.write(data);
        }

          ClientSocket.pipe(serverSocket,options);

          serverSocket.pipe(ClientSocket,options);


        serverSocket.on("error", (err) => {
          console.log("Error while connecting to proxy (server-side)");
          console.log(err);
        });
      }
    );
    ClientSocket.on("error", (err) => {
      console.log("Error while connecting to proxy (Client-side)");
      console.log(err);
    });
  });

});

server.on("error", (err) => {
  console.log("SERVER ERROR");
  console.log(err);
  throw err;
});

server.on("close", () => {
  console.log("Client Disconnected");
});

server.listen(LISTENING_PORT, () => {
  console.log("Server runnig at http://localhost:" + LISTENING_PORT);
});