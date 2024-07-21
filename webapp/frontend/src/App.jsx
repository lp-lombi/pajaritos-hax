import { useEffect, useState } from "react";
import { useApi } from "./services/ApiService";

import Header from "./components/Header";
import StartForm from "./components/StartForm";
import PlayersList from "./components/PlayersList";
import RoomOptions from "./components/RoomOptions";
import Chat from "./components/Chat";

function App() {
    const { getRoomStatus, update, roomOpen } = useApi();

    useEffect(() => {
        getRoomStatus();
    }, []);

    useEffect(() => {
        console.log("Cambiado elestado de la sala a: " + roomOpen);
    }, [roomOpen]);

    return (
        <>
            <Header />
            <main className="col">
                {!roomOpen ? (
                    <StartForm />
                ) : (
                    <>
                        <div className="flex gap3" style={{ width: "80%" }}>
                            <RoomOptions /> <PlayersList />
                        </div>
                        <div className="flex" style={{ width: "80%" }}>
                            <Chat />
                        </div>
                    </>
                )}
            </main>
        </>
    );
}

export default App;
