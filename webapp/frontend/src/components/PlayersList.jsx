import "./PlayersList.css";

import React from "react";
import { useApi } from "../services/ApiService";

export const PlayersList = () => {
    const { players } = useApi();

    return (
        <section>
            <h1>Jugadores</h1>
            <ul className="players-list">
                {players.map((p) => (
                    <li>
                        {p.name} {p.id !== 0 ? <button>kick</button> : null}
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default PlayersList;
