//
var cors = require("cors");
var express = require("express");
var app = express();

const port = 8001;
const router = require("./routes");

app.set("view engine", "ejs");
app.use(express.json());
app.use(cors());
app.use("/", router);

app.listen(port);

console.log(`API corriendo en puerto ${port}`);
