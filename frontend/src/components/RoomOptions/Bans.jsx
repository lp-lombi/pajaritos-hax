import React, { useEffect, useRef, useState } from "react";
import { useApi } from "../../services/ApiService";
import { usePopup } from "../../services/PopupService";

export const Bans = () => {
    const { roomData, unbanPlayer } = useApi();
    const { popupConfirm } = usePopup();

    return (
        <div className="bans">
            {roomData.bannedPlayers.length > 0 ? (
                <ul>
                    {roomData.bannedPlayers.map((ban) => {
                        if (ban.type !== 1 && ban.type !== 2) {
                            return (
                                <li key={ban.value.pId}>
                                    <div className="top">
                                        <div>
                                            <span className="name">
                                                {ban.value.pName}
                                            </span>
                                        </div>
                                        <div>
                                            <span>ID: {ban.value.pId}</span>
                                        </div>
                                    </div>
                                    <div className="bottom">
                                        <div className="col50">
                                            {" "}
                                            <div>
                                                {ban.value.ips.map((ip) => (
                                                    <span key={ip}>{ip} </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="col50">
                                            <button
                                                onClick={() =>
                                                    unbanPlayer(ban.value.pId)
                                                }
                                            >
                                                Desbanear
                                            </button>
                                            <button
                                                onClick={() =>
                                                    popupConfirm(
                                                        "Banear permanentemente",
                                                        "Se baneará permanentemente la IP del jugador " +
                                                            ban.value.pName,
                                                        () => {
                                                            fetch(
                                                                `/room/kick/permaban`,
                                                                {
                                                                    method: "POST",
                                                                    headers: {
                                                                        "Content-Type":
                                                                            "application/json",
                                                                    },
                                                                    body: JSON.stringify(
                                                                        {
                                                                            name: ban
                                                                                .value
                                                                                .pName,
                                                                            ip: ban
                                                                                .value
                                                                                .ips[0],
                                                                            auth: ban
                                                                                .value
                                                                                .auth,
                                                                        }
                                                                    ),
                                                                }
                                                            ).then((res) => {
                                                                console.log(
                                                                    res
                                                                );
                                                            });
                                                        }
                                                    )
                                                }
                                            >
                                                Permaban
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        }
                    })}
                </ul>
            ) : (
                <h3>No hay bans</h3>
            )}
        </div>
    );
};

export default Bans;
