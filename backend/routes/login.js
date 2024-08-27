const express = require("express");
const login = express.Router();
const jwt = require("jsonwebtoken");

login.post("/", function (req, res) {
    fetch(global.webApi.url + "/users/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username: req.body.username,
            password: req.body.password,
        }),
    })
        .then((response) => {
            if (response.ok) {
                response.json().then((data) => {
                    if (data.validated && data.role > 0) {
                        const token = jwt.sign(data, global.secretKey, {
                            expiresIn: "2h",
                        });
                        res.json({ token });
                    } else {
                        res.send(data);
                    }
                });
            } else {
                console.log(response.status + " | " + response.statusText);
                res.status(401).send({
                    message: "No se pudo iniciar la sesión",
                });
            }
        })
        .catch((err) => {
            console.log(err);
            res.status(401).send({
                message: "Error al iniciar la sesión",
            });
        });
});

module.exports = login;
