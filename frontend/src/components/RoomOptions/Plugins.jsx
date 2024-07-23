import React, { useState } from "react";
import { useApi } from "../../services/ApiService";

export const Plugins = () => {
    const { roomData } = useApi();

    const [selectedPlugin, setSelectedPlugin] = useState(null);

    const handleSelectPlugin = (e) => {
        setSelectedPlugin(
            roomData.plugins.find(
                (pl) => pl.name === e.target.getAttribute("pl-name")
            )
        );
    };

    return (
        <div className="plugins">
            <div>
                <ul>
                    {roomData.plugins.map((pl) => {
                        return (
                            <li
                                className={
                                    selectedPlugin
                                        ? selectedPlugin.name === pl.name
                                            ? "selected"
                                            : ""
                                        : null
                                }
                                key={pl.name}
                                pl-name={pl.name}
                                onClick={handleSelectPlugin}
                            >
                                {pl.name}
                            </li>
                        );
                    })}
                </ul>
                <div className="settings-box">
                    {selectedPlugin ? (
                        <div key={selectedPlugin.name}>
                            <h4>{selectedPlugin.name}</h4>
                            {selectedPlugin.settings ? (
                                selectedPlugin.settings.map((s) => (
                                    <div className="setting" key={s.name}>
                                        <div>
                                            <span
                                                key={s.name}
                                                title={s.description}
                                            >
                                                {s.name}
                                            </span>
                                        </div>

                                        <div>
                                            {s.type === "bool" ? (
                                                <input
                                                    style={{
                                                        justify: "flex-end",
                                                    }}
                                                    type="checkbox"
                                                    value={s.value}
                                                    defaultChecked={s.value}
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <span>
                                    El plugin no tiene ajustes públicos.
                                </span>
                            )}
                        </div>
                    ) : (
                        <>
                            <h4>Elegir un plugin de la lista</h4>
                        </>
                    )}
                </div>
            </div>
            <div className="button-container">
                <button>Guardar</button>
                <button>Descartar</button>
            </div>
        </div>
    );
};

export default Plugins;
