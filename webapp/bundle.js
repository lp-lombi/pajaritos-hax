'use strict';

//

var express = require("express");
var app = express();
app.set("view engine", "ejs");

const port = 8000;
const router = require("./routes/routes");

app.use("/", router);

app.listen(port);

console.log(`Servidor en la url http://127.0.0.1:${port}/`);
