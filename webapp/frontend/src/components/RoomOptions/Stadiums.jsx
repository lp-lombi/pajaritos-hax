import React, { useState } from "react";
import { useApi } from "../../services/ApiService";

export const Stadiums = () => {
    const { roomData, loadStadium } = useApi();

    const [selectedStadium, setSelectedStadium] = useState(null);

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

    return (
        <div className="stadiums">
            <div>
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
            </div>
            <div className="button-container">
                <button
                    onClick={handleLoadStadium}
                    style={{ width: "100%", marginTop: "20px" }}
                >
                    Cargar
                </button>
            </div>
        </div>
    );
};

export default Stadiums;
