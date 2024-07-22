import "./Chat.css";

import React, { useState } from "react";
import { useApi } from "../services/ApiService";

export const Chat = () => {
    const { players, sendMsg } = useApi();

    const [msg, setMsg] = useState("");

    const handleSubmitMsg = (e) => {
        e.preventDefault();
        if (msg !== "") {
            sendMsg(msg);
            setMsg("");
        }
    };

    return (
        <section className="chat">
            <h1>Chat</h1>
            <form onSubmit={handleSubmitMsg} style={{ width: "100%" }}>
                <input
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    type="text"
                    style={{ height: "30px" }}
                />
            </form>
        </section>
    );
};

export default Chat;
