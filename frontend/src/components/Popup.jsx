import React, { useState } from "react";
import "./Popup.css";
import { usePopup } from "../services/PopupService";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useApi } from "../services/ApiService";

export const Popup = ({}) => {
    const { params, isOpen, setIsOpen, type, title, msg } = usePopup();
    const { stopRoom, kickPlayer } = useApi();

    // Kickban options
    const [ban, setBan] = useState(false);
    const [kickReason, setKickReason] = useState("");

    const handleSetOpen = (e) => {
        if (e.target.className === "popup") {
            setIsOpen(false);
        }
    };

    const handleConfirm = () => {
        if (params.callback) params.callback();
        setIsOpen(false);
    };

    const handleKickBan = () => {
        console.log(params.id, kickReason, ban);
        kickPlayer(params.id, kickReason, ban);

        setIsOpen(false);
        setBan(false);
    };

    return (
        <>
            {isOpen ? (
                <div className="popup" onClick={handleSetOpen}>
                    <div className="box">
                        <div className="box-container">
                            <div className="top">
                                <h1>{title}</h1>
                                {msg}
                            </div>
                            <div className="bottom">
                                {type === "confirm" ? (
                                    <div className="button-container">
                                        <button onClick={handleConfirm}>
                                            Aceptar
                                        </button>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                ) : type === "loading" ? (
                                    <FontAwesomeIcon
                                        icon={faSpinner}
                                        size="2x"
                                        spin={true}
                                    />
                                ) : type === "alert" ? (
                                    <div className="button-container">
                                        <button
                                            onClick={() => setIsOpen(false)}
                                        >
                                            Aceptar
                                        </button>
                                    </div>
                                ) : type === "kickban" ? (
                                    <div className="kickban">
                                        <div className="kickban-options">
                                            <input
                                                value={kickReason}
                                                onChange={(e) =>
                                                    setKickReason(
                                                        e.target.value
                                                    )
                                                }
                                                type="text"
                                                placeholder="Motivo"
                                            />
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <input
                                                    value={ban}
                                                    onChange={(e) => {
                                                        setBan(
                                                            e.target.checked
                                                        );
                                                    }}
                                                    name="ban"
                                                    type="checkbox"
                                                />
                                                <label htmlFor="ban">Ban</label>
                                            </div>
                                        </div>
                                        <div className="button-container">
                                            <button onClick={handleKickBan}>
                                                Aceptar
                                            </button>
                                            <button
                                                onClick={() => setIsOpen(false)}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
};

export default Popup;
