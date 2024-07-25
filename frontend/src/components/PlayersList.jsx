import "./PlayersList.css";

import React from "react";
import { useApi } from "../services/ApiService";

export const PlayersList = () => {
    const { players, kickPlayer } = useApi();

    return (
        <section className="players">
            <h1>Jugadores</h1>
            <ul className="players-list">
                {players.map((p) => (
                    <li key={p.id}>
                        {p.name}{" "}
                        {p.id !== 0 ? (
                            <button onClick={() => kickPlayer(p.id)}>
                                kick
                            </button>
                        ) : null}
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default PlayersList;
