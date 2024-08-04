import "./PlayersList.css";

import React from "react";
import { useApi } from "../services/ApiService";
import { usePopup } from "../services/PopupService";

export const PlayersList = () => {
    const { popupKickban } = usePopup();
    const { players } = useApi();

    return (
        <section className="players">
            <h1>Jugadores: {players.length}</h1>
            <ul className="players-list">
                {players.map((p) => (
                    <li key={p.id}>
                        {p.name}{" "}
                        {p.id !== 0 ? (
                            <button
                                onClick={() =>
                                    popupKickban(
                                        "Kickear jugador",
                                        "Se expulsará al jugador " + p.name,
                                        p.id
                                    )
                                }
                            >
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
