import "./Chat.css";

import React from "react";
import { useApi } from "../services/ApiService";

export const Chat = () => {
    const { players } = useApi();

    return (
        <section className="chat">
            <h1>Chat</h1>
            <textarea rows={4} cols={50} style={{ resize: "none" }}></textarea>
        </section>
    );
};

export default Chat;
