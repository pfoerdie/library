const
    Path = require('path'),
    Http = require('http'),
    Express = require('express'),
    ExpressLibrary = require("./service.library.js");

let
    app = Express(),
    server = Http.createServer(app);

app.get('/', function (request, response) {
    response.sendFile(Path.join(__dirname, "test.html"));
});

app.use(ExpressLibrary.Router());

server.listen(80, () => console.log("running"));