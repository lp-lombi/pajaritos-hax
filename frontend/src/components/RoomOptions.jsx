import React, { useEffect, useState } from "react";
import "./RoomOptions.css";
import { useApi } from "../services/ApiService";
import Plugins from "./RoomOptions/Plugins";
import Stadiums from "./RoomOptions/Stadiums";

export const RoomOptions = () => {
    const { stopRoom, startGame, stopGame, roomData, fetchRoomData } = useApi();
    const [option, setOption] = useState("stadiums");

    return (
        <section className="room-options">
            <div className="panel">
                <div className="panel-top">
                    <button onClick={startGame}>Iniciar juego</button>
                    <button onClick={stopGame}>Detener juego</button>
                    <button
                        onClick={stopRoom}
                        style={{ backgroundColor: "rgba(150, 50, 50, 0.5)" }}
                    >
                        Cerrar host
                    </button>
                </div>
                <div className="panel-bottom">
                    {roomData ? (
                        <>
                            <h3>{roomData.name}</h3>
                            <div>
                                <span>Estadio: {roomData.stadiumName}</span>
                            </div>
                            <a href={roomData.link} target="_blank">
                                {roomData.link}
                            </a>

                            <div className="tab-container">
                                <div
                                    className="tab"
                                    onClick={() => setOption("stadiums")}
                                >
                                    <span>Estadios</span>
                                </div>
                                <div
                                    className="tab"
                                    onClick={() => setOption("plugins")}
                                >
                                    <span>Plugins</span>
                                </div>
                            </div>
                            {option === "stadiums" ? (
                                <Stadiums />
                            ) : option === "plugins" ? (
                                <Plugins />
                            ) : null}
                        </>
                    ) : null}
                </div>
            </div>
        </section>
    );
};

export default RoomOptions;
