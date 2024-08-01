import React, { createContext, useContext, useEffect, useState } from "react";
import { usePopup } from "./PopupService";

const ApiContext = createContext();

export const ApiService = ({ children }) => {
    const { popupLoading, popupAlert, closePopup } = usePopup();

    const [roomStatus, setRoomStatus] = useState(null);
    const [roomData, setRoomData] = useState(null);
    const [gameData, setGameData] = useState(null);
    const [players, setPlayers] = useState([]);
    const [chatLog, setChatLog] = useState("");

    const fetchPlayers = () => {
        fetch(`/players/all`).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    setPlayers(data.players);
                });
            }
        });
    };

    const getDefaultConfig = async () => {
        return new Promise((resolve, reject) => {
            fetch(`/room/config`).then((res) => {
                if (res.ok) {
                    res.json().then((data) => {
                        resolve(data);
                    });
                }
            });
        });
    };

    const fetchRoomStatus = (attempts = 0) => {
        fetch(`/room/status`).then((res) => {
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
            fetch(`/room`).then((res) => {
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
            },
            body: JSON.stringify(config),
        }).then((res) => {
            if (res.ok) {
                fetchRoomStatus();
            } else {
                resolve(false);
            }
        });
    };

    const stopRoom = () => {
        fetch(`/room/stop`, {
            method: "POST",
        }).then((res) => {
            if (res.ok) {
                fetchRoomStatus();
            }
        });
    };

    const startGame = () => {
        fetch(`/game/start`).then((res) => {
            if (!res.ok) {
                console.log("Error al iniciar juego");
            } else {
                fetchGameData();
            }
        });
    };

    const pauseGame = () => {
        fetch(`/game/pause`).then((res) => {
            if (!res.ok) {
                console.log("Error al pausar juego");
            } else {
                fetchGameData();
            }
        });
    };

    const stopGame = () => {
        fetch(`/game/stop`).then((res) => {
            if (!res.ok) {
                console.log("Error al detener juego");
            } else {
                fetchGameData();
            }
        });
    };

    const fetchGameData = () => {
        fetch(`/game/data`).then((res) => {
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
            },
            body: JSON.stringify({ stadiumName }),
        }).then((res) => {
            if (!res.ok) {
                console.log("Error al guardar estadio");
            }
        });
    };

    const kickPlayer = (id, reason = "", ban = false) => {
        fetch(`/room/kick?id=${id}&reason=${reason}&ban=${ban}`).then((res) => {
            if (res.ok) {
                return;
            } else {
                console.log("Error al kickear");
            }
        });
    };

    const unbanPlayer = (id) => {
        fetch(`/room/kick/unban?id=${id}`, { method: "POST" }).then((res) => {
            if (!res.ok) {
                console.log("Error al desbanear");
            }
        });
    };

    const fetchChat = () => {
        fetch(`/room/chat`).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    setChatLog(data.chat);
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
