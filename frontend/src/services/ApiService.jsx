import React, { createContext, useContext, useEffect, useState } from "react";
import { usePopup } from "./PopupService";

const ApiContext = createContext();

export const ApiService = ({ children }) => {
    const { popupLoading, popupAlert, closePopup } = usePopup();

    const [apiToken, setApiToken] = useState("");

    const [roomStatus, setRoomStatus] = useState(null);
    const [roomData, setRoomData] = useState(null);
    const [gameData, setGameData] = useState(null);
    const [players, setPlayers] = useState([]);
    const [chatLog, setChatLog] = useState("");

    const login = (username, password) => {
        fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        }).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    if (data.token) {
                        localStorage.setItem("token", data.token);
                        setApiToken(data.token);
                    } else {
                        localStorage.setItem("token", "");
                        setApiToken("");
                        popupAlert(
                            "No se pudo validar",
                            "Usuario o contraseña incorrectos."
                        );
                    }
                });
            } else {
                localStorage.setItem("token", "");
                setApiToken("");
                popupAlert("No se pudo validar", "Error del servidor.");
                console.log(res.statusText);
            }
        });
    };

    const fetchPlayers = () => {
        fetch(`/players/all`, {
            headers: {
                token: apiToken,
            },
        }).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    setPlayers(data.players);
                });
            }
        });
    };

    const getDefaultConfig = async () => {
        return new Promise((resolve, reject) => {
            fetch(`/room/config`, {
                headers: {
                    token: apiToken,
                },
            }).then((res) => {
                if (res.ok) {
                    res.json().then((data) => {
                        resolve(data);
                    });
                }
            });
        });
    };

    const fetchRoomStatus = (attempts = 0) => {
        fetch(`/room/status`, {
            headers: {
                token: apiToken,
            },
        }).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    if (data.status === "open") {
                        setRoomStatus("open");
                        fetchRoomData();
                        closePopup();
                    } else if (data.status === "token") {
                        if (attempts < 12) {
                            setTimeout(
                                () => fetchRoomStatus(attempts + 1),
                                200
                            );
                        } else {
                            setRoomStatus("token");
                            stopRoom();
                            popupAlert("Token expirado", "Generá uno nuevo.");
                        }
                    } else if (data.status === "closed") {
                        setRoomStatus("closed");
                    }
                });
            }
        });
    };

    const fetchRoomData = async () => {
        return new Promise(async (resolve, reject) => {
            fetch(`/room`, {
                headers: {
                    token: apiToken,
                },
            }).then((res) => {
                if (res.ok) {
                    res.json().then((data) => {
                        setRoomData(data);
                    });
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    };

    const startRoom = async (config) => {
        popupLoading("Iniciando sala", "");

        fetch(`/room/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                token: apiToken,
            },
            body: JSON.stringify(config),
        }).then((res) => {
            if (res.ok) {
                fetchRoomStatus();
            } else {
                res.text().then((str) => {
                    popupAlert(str);
                });
            }
        });
    };

    const stopRoom = () => {
        fetch(`/room/stop`, {
            method: "POST",
            headers: {
                token: apiToken,
            },
        }).then((res) => {
            if (res.ok) {
                fetchRoomStatus();
            }
        });
    };

    const startGame = () => {
        fetch(`/game/start`, {
            headers: {
                token: apiToken,
            },
        }).then((res) => {
            if (!res.ok) {
                console.log("Error al iniciar juego");
            } else {
                fetchGameData();
            }
        });
    };

    const pauseGame = () => {
        fetch(`/game/pause`, {
            headers: {
                token: apiToken,
            },
        }).then((res) => {
            if (!res.ok) {
                console.log("Error al pausar juego");
            } else {
                fetchGameData();
            }
        });
    };

    const stopGame = () => {
        fetch(`/game/stop`, {
            headers: {
                token: apiToken,
            },
        }).then((res) => {
            if (!res.ok) {
                console.log("Error al detener juego");
            } else {
                fetchGameData();
            }
        });
    };

    const fetchGameData = () => {
        fetch(`/game/data`, {
            headers: {
                token: apiToken,
            },
        }).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    setGameData(data);
                });
            } else {
                console.log("Error al detener juego");
            }
        });
    };

    const loadStadium = (stadium) => {
        fetch(`/game/stadium/load`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                token: apiToken,
            },
            body: JSON.stringify({ stadium }),
        }).then((res) => {
            if (!res.ok) {
                console.log("Error al cargar estadio");
            } else {
                fetchRoomData();
            }
        });
    };

    const saveStadium = (stadiumName) => {
        fetch(`/game/stadium/save`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                token: apiToken,
            },
            body: JSON.stringify({ stadiumName }),
        }).then((res) => {
            if (!res.ok) {
                console.log("Error al guardar estadio");
            }
        });
    };

    const kickPlayer = (id, reason = "", ban = false) => {
        fetch(`/room/kick?id=${id}&reason=${reason}&ban=${ban}`, {
            method: "POST",
            headers: {
                token: apiToken,
            },
        }).then((res) => {
            if (res.ok) {
                return;
            } else {
                console.log("Error al kickear");
            }
        });
    };

    const permaBanPlayer = (name, ip, auth) => {
        fetch(`/room/kick/permaban`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                token: apiToken,
            },
            body: JSON.stringify({
                name,
                ip,
                auth,
            }),
        }).then((res) => {
            console.log(res);
        });
    };

    const unbanPlayer = (id) => {
        fetch(`/room/kick/unban?id=${id}`, {
            method: "POST",
            headers: { token: apiToken },
        }).then((res) => {
            if (!res.ok) {
                console.log("Error al desbanear");
            }
        });
    };

    const fetchChat = () => {
        fetch(`/room/chat`, {
            headers: {
                token: apiToken,
            },
        }).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    let chat = "";
                    data.chat.forEach((m) => (chat += m.text + "\n"));
                    setChatLog(chat);
                });
            } else {
                console.log("Error al recibir mensajes");
            }
        });
    };

    const sendMsg = (msg) => {
        fetch(`/room/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                token: apiToken,
            },
            body: JSON.stringify({ msg }),
        }).then((res) => {
            if (res.ok) {
                fetchChat();
                return;
            } else {
                console.log("Error al enviar mensaje");
            }
        });
    };

    // Este useEffect es solo para hacer un get a este endpoint que solo devuelve
    // el estado. La unica posibilidad de que falle es si el token es invalido.
    // Si el token es invalido, se borra de la memoria local.
    useEffect(() => {
        fetch(`/room/status`, {
            headers: {
                token: localStorage.getItem("token"),
            },
        }).then((res) => {
            if (res.status === 401 || res.status === 403) {
                localStorage.setItem("token", "");
                setApiToken("");
                console.log(
                    "Token previo posiblemente expirado: \n" + res.statusText
                );
            }
        });
    }, []);

    useEffect(() => {
        if (roomStatus === "open") {
            fetchPlayers();
            fetchGameData();
        }
    }, [roomStatus]);

    useEffect(() => {
        setTimeout(() => {
            fetchPlayers();
            fetchRoomData();
            fetchChat();
            fetchGameData();
        }, 1000);
    }, [players]);

    return (
        <ApiContext.Provider
            value={{
                apiToken,
                setApiToken,
                login,

                fetchPlayers,
                fetchRoomData,
                roomData,

                fetchRoomStatus,
                getDefaultConfig,

                startRoom,
                startGame,
                pauseGame,
                stopRoom,
                stopGame,
                gameData,

                loadStadium,
                saveStadium,

                kickPlayer,
                permaBanPlayer,
                unbanPlayer,

                sendMsg,
                fetchChat,
                chatLog,

                players,

                roomStatus,
                setRoomStatus,
            }}
        >
            {children}
        </ApiContext.Provider>
    );
};

export const useApi = () => {
    return useContext(ApiContext);
};

export default ApiService;
