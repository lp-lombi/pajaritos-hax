import React, { useState } from "react";
import { useApi } from "../../services/ApiService";

export const Bans = () => {
    const { roomData } = useApi();

    const [selectedStadium, setSelectedStadium] = useState(null);
    const [newStadiumName, setNewStadiumName] = useState("");

    return (
        <div className="bans">
            <ul>
                {roomData.banedPlayers.map((ban) => {
                    return (
                        <li>
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
                                <div>
                                    {ban.value.ips.map((ip) => (
                                        <span>{ip} </span>
                                    ))}
                                </div>
                                <button>Desbanear</button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default Bans;
