import React, { useState } from "react";
import { useApi } from "../../services/ApiService";

export const Stadiums = () => {
    const { roomData, loadStadium, saveStadium } = useApi();

    const [selectedStadium, setSelectedStadium] = useState(null);
    const [newStadiumName, setNewStadiumName] = useState("");

    const handleSelectStadium = (e) => {
        setSelectedStadium(
            roomData.stadiums.find(
                (st) => st === e.target.getAttribute("st-name")
            )
        );
    };

    const handleLoadStadium = () => {
        if (selectedStadium) {
            loadStadium(selectedStadium);
        } else {
            alert("Elegí un estadio");
        }
    };

    const handleSaveStadium = () => {
        if (newStadiumName !== "") {
            saveStadium(newStadiumName);
        } else {
            alert("El nombre no puede estar vacío");
        }
    };

    return (
        <div className="stadiums">
            <ul>
                {roomData.stadiums.map((st) => {
                    return (
                        <li
                            className={
                                selectedStadium
                                    ? selectedStadium === st
                                        ? "selected"
                                        : ""
                                    : null
                            }
                            key={st}
                            st-name={st}
                            onClick={handleSelectStadium}
                        >
                            {st}
                        </li>
                    );
                })}
            </ul>
            <div className="button-container">
                <button
                    onClick={handleLoadStadium}
                    style={{ width: "100%", marginTop: "20px" }}
                >
                    Cargar
                </button>
                <div className="download">
                    <input
                        value={newStadiumName}
                        onChange={(e) => setNewStadiumName(e.target.value)}
                        type="text"
                        placeholder="Nombre del archivo"
                    />
                    <button onClick={handleSaveStadium}>
                        Descargar mapa actual
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Stadiums;
