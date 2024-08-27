import { useEffect, useState } from "react";
import { useApi } from "../services/ApiService";

import Header from "../components/Header";
import StartForm from "../components/StartForm";
import PlayersList from "../components/PlayersList";
import RoomOptions from "../components/RoomOptions";
import Chat from "../components/Chat";

function App() {
    const { apiToken, setApiToken, fetchRoomStatus, roomStatus } = useApi();

    useEffect(() => {
        if (apiToken) {
            fetchRoomStatus();
        }
    }, []);

    useEffect(() => {
        console.log("Cambiado elestado de la sala a: " + roomStatus);
    }, [roomStatus]);

    return (
        <>
            <Header />
            <main>
                <div className="main-container">
                    {!roomStatus ? null : roomStatus === "closed" ||
                      roomStatus === "token" ? (
                        <StartForm />
                    ) : (
                        <>
                            <div
                                className="col50"
                                style={{
                                    minWidth: "400px",
                                }}
                            >
                                <div className="container90">
                                    <RoomOptions />
                                </div>
                            </div>
                            <div
                                className="col50"
                                style={{ minWidth: "400px" }}
                            >
                                <div className="container90">
                                    <PlayersList />
                                    <Chat />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </>
    );
}

export default App;
