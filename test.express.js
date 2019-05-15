const
    Http = require('http'),
    Express = require('express'),
    ExpressLibrary = require("./service.library.js");

let
    app = Express(),
    server = Http.createServer(app);

app.use(ExpressLibrary);

server.listen(80, () => console.log("running"));