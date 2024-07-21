import React, { createContext, useContext, useEffect, useState } from "react";

const ApiContext = createContext();

export const ApiService = ({ children }) => {
    let APIURL = "http://localhost:8001";

    const [roomOpen, setRoomOpen] = useState(false);
    const [players, setPlayers] = useState([]);

    const fetchPlayers = () => {
        fetch(`${APIURL}/players/all`).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    setPlayers(data.players);
                });
            }
        });
    };

    const update = () => {
        fetchPlayers();
    };

    const getDefaultConfig = async () => {
        return new Promise((resolve, reject) => {
            fetch(`${APIURL}/defaultConfig`).then((res) => {
                if (res.ok) {
                    res.json().then((data) => {
                        resolve(data);
                    });
                }
            });
        });
    };

    const getRoomStatus = () => {
        fetch(`${APIURL}/status`).then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    setRoomOpen(data.open);
                });
            }
        });
    };

    const stopRoom = () => {
        setRoomOpen(false);

        fetch(`${APIURL}/stop`, {
            method: "POST",
        }).then((res) => {
            if (res.ok) {
                setRoomOpen(false);
            }
        });
    };

    const startRoom = (config) => {
        fetch(`${APIURL}/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(config),
        }).then((res) => {
            if (res.ok) {
                setRoomOpen(true);
            }
        });
    };

    useEffect(() => {
        fetchPlayers();

        console.log(roomOpen);
    }, [roomOpen]);

    useEffect(() => {
        setTimeout(() => {
            fetchPlayers();
        }, 500);
    }, [players]);

    return (
        <ApiContext.Provider
            value={{
                APIURL,
                fetchPlayers,
                update,
                getRoomStatus,
                getDefaultConfig,
                startRoom,
                stopRoom,
                players,
                roomOpen,
                setRoomOpen,
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
