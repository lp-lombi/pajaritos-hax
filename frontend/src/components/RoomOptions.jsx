import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faStop } from "@fortawesome/free-solid-svg-icons";

import "./RoomOptions.css";
import { useApi } from "../services/ApiService";
import Stadiums from "./RoomOptions/Stadiums";
import Bans from "./RoomOptions/Bans";
import Plugins from "./RoomOptions/Plugins";
import { usePopup } from "../services/PopupService";

export const RoomOptions = () => {
    const { stopRoom, startGame, pauseGame, stopGame, roomData, gameData } =
        useApi();
    const { popupConfirm } = usePopup();

    const [option, setOption] = useState("stadiums");

    return (
        <section className="room-options">
            <div className="panel">
                <div className="panel-top">
                    <span>Ajustes de la sala</span>

                    <button
                        onClick={() =>
                            popupConfirm(
                                "Cerrar la sala",
                                "Confirmar para cerrar la sala",
                                stopRoom
                            )
                        }
                        style={{ backgroundColor: "rgba(150, 50, 50, 0.5)" }}
                    >
                        Cerrar host
                    </button>
                </div>
                <div className="panel-bottom">
                    {roomData ? (
                        <>
                            <div className="room-info">
                                <div className="top">
                                    <span>{roomData.name}</span>
                                    <br />
                                    <a href={roomData.link} target="_blank">
                                        {roomData.link}
                                    </a>
                                </div>
                                <div className="mid">
                                    <div className="score">
                                        {gameData ? (
                                            gameData.state !== "stopped" ? (
                                                <>
                                                    {" "}
                                                    <div>
                                                        <span
                                                            style={{
                                                                color: "#FFBFBF",
                                                            }}
                                                        >
                                                            {gameData.redScore}
                                                        </span>
                                                        <span> - </span>
                                                        <span
                                                            style={{
                                                                color: "#BFC1FF",
                                                            }}
                                                        >
                                                            {gameData.blueScore}
                                                        </span>
                                                    </div>
                                                    {gameData.state ===
                                                    "paused" ? (
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    "12px",
                                                                position:
                                                                    "absolute",
                                                                top: "0px",
                                                            }}
                                                        >
                                                            (pausado)
                                                        </span>
                                                    ) : null}
                                                </>
                                            ) : (
                                                <span
                                                    style={{ fontSize: "14px" }}
                                                >
                                                    Juego detenido
                                                </span>
                                            )
                                        ) : null}
                                    </div>
                                    <div className="controls">
                                        {gameData ? (
                                            <>
                                                {gameData.state !==
                                                "stopped" ? (
                                                    <>
                                                        {gameData.state ===
                                                        "paused" ? (
                                                            <button
                                                                onClick={
                                                                    pauseGame
                                                                }
                                                                className="play"
                                                            >
                                                                <FontAwesomeIcon
                                                                    icon={
                                                                        faPlay
                                                                    }
                                                                ></FontAwesomeIcon>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={
                                                                    pauseGame
                                                                }
                                                                className="pause"
                                                            >
                                                                <FontAwesomeIcon
                                                                    icon={
                                                                        faPause
                                                                    }
                                                                ></FontAwesomeIcon>
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={startGame}
                                                        className="play"
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faPlay}
                                                        ></FontAwesomeIcon>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={stopGame}
                                                    className="stop"
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faStop}
                                                    ></FontAwesomeIcon>
                                                </button>
                                            </>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="bottom">
                                    <span>Estadio: {roomData.stadiumName}</span>
                                </div>
                            </div>

                            <div className="tab-container">
                                <div
                                    className="tab"
                                    onClick={() => setOption("stadiums")}
                                >
                                    <span>Estadios</span>
                                </div>
                                <div
                                    className="tab"
                                    onClick={() => setOption("bans")}
                                >
                                    <span>Baneos</span>
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
                            ) : option === "bans" ? (
                                <Bans />
                            ) : null}
                        </>
                    ) : null}
                </div>
            </div>
        </section>
    );
};

export default RoomOptions;
