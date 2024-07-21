import React from "react";
import "./RoomOptions.css";
import { useApi } from "../services/ApiService";

export const RoomOptions = () => {
    const { stopRoom } = useApi();

    return (
        <section
            className="room-options"
            style={{ width: "100px", minWidth: "100px" }}
        >
            <div className="flex col" style={{ gap: "20%", height: "100%" }}>
                <button>Reiniciar</button>
                <button onClick={stopRoom}>Cerrar host</button>
            </div>
        </section>
    );
};

export default RoomOptions;
