import React, { useEffect, useRef, useState } from "react";
import { useApi } from "../../services/ApiService";
import { usePopup } from "../../services/PopupService";

export const Bans = () => {
    const [roomBans, setRoomBans] = useState([]);
    const { roomData, permaBans, permaBanPlayer, deletePermaBan, unbanPlayer } = useApi();
    const { popupConfirm } = usePopup();

    useEffect(() => {
        setRoomBans(roomData.bannedPlayers.filter((b) => b.type !== 1 && b.type !== 2));
    }, [roomData]);

    return (
        <div className="bans">
            <ul>
                {roomBans.length > 0 ? (
                    <li className="title">
                        <span>Bans de esta sala</span>
                    </li>
                ) : null}

                {roomBans.map((ban) => {
                    if (ban.type !== 1 && ban.type !== 2) {
                        return (
                            <li key={ban.value.pId}>
                                <div className="top">
                                    <div>
                                        <span className="name">{ban.value.pName}</span>
                                    </div>
                                    <div>
                                        <span>ID: {ban.value.pId}</span>
                                    </div>
                                </div>
                                <div className="bottom">
                                    <div className="col50">
                                        <div>{ban.value.ips[0] ? <span key={ban.value.ips[0]}>{ban.value.ips[0]} </span> : null}</div>
                                    </div>
                                    <div className="col50">
                                        <button onClick={() => unbanPlayer(ban.value.pId)}>Desbanear</button>
                                        <button
                                            onClick={() =>
                                                popupConfirm(
                                                    "Banear permanentemente",
                                                    "Se baneará permanentemente la IP del jugador " + ban.value.pName,
                                                    () => {
                                                        permaBanPlayer(ban.value.pName, ban.value.ips[0], ban.value.auth);
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
                <li className="title">Permabans</li>
                {permaBans.map((ban) => (
                    <li key={ban.id} className="permaBan">
                        <div className="top">
                            <div className="col50">
                                <span className="name">{ban.name}</span>
                            </div>
                            <div className="col50">
                                <span>ID BBDD: {ban.id}</span>
                            </div>
                        </div>
                        <div className="bottom">
                            <div className="col50">
                                <span> {ban.ip}</span>
                            </div>
                            <div className="col50">
                                <button onClick={() => deletePermaBan(ban.id)}>Revocar</button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Bans;
