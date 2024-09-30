const express = require("express");
const service = express.Router();

service.get("/bans/perma/all", function (req, res) {
    fetch(global.webApi.url + "/bans/all", {
        method: "GET",
        headers: { "x-api-key": global.webApi.key },
    })
        .then((res) => {
            if (res.ok) {
                return res.json();
            } else {
                throw new Error("Error al obtener permabans");
            }
        })
        .then((bans) => {
            res.send(bans);
        })
        .catch((err) => console.log(err));
});

service.delete("/bans/perma/:id", function (request, response) {
    if (request.params.id && !isNaN(request.params.id)) {
        fetch(global.webApi.url + "/bans/" + request.params.id, {
            method: "DELETE",
            headers: { "x-api-key": global.webApi.key },
        })
            .then((res) => {
                if (res.ok) {
                    response.send("Permaban eliminado");
                } else {
                    throw new Error("Error al obtener permabans");
                }
            })
            .catch((err) => response("Error: " + err));
    } else {
        response.status(400).send("ID inválido");
    }
});

module.exports = service;
