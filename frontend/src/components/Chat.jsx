import "./Chat.css";

import React, { useEffect, useRef, useState } from "react";
import { useApi } from "../services/ApiService";

export const Chat = () => {
    const { players, sendMsg, chatLog } = useApi();

    const chatBoxRef = useRef(null);

    const [msg, setMsg] = useState("");

    const handleSubmitMsg = (e) => {
        e.preventDefault();
        if (msg !== "") {
            sendMsg(msg);
            setMsg("");
        }
    };

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [chatLog]);

    return (
        <section className="chat">
            <h1>Chat</h1>
            <div ref={chatBoxRef}>
                {chatLog.split("\n").map((line, i) => {
                    return <span key={i}>{line}</span>;
                })}
            </div>
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
