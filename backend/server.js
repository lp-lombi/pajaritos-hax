//
var cors = require("cors");
var express = require("express");
var app = express();

const port = 8000;
const router = require("./routes");

app.use(express.json());
app.use(cors());
app.use(express.static("views/dist"));
app.use("/", router);

app.listen(port);

console.log(`Servidor web corriendo en http://localhost:${port}/`);
