import React, { useEffect, useRef, useState } from "react";
import { useApi } from "../../services/ApiService";

export const Bans = () => {
    const { roomData, unbanPlayer } = useApi();

    return (
        <div className="bans">
            {roomData.bannedPlayers.length > 0 ? (
                <ul>
                    {roomData.bannedPlayers.map((ban) => {
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
                                        <button>Permaban</button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <h3>No hay bans</h3>
            )}
        </div>
    );
};

export default Bans;
