import React, { useEffect, useState } from "react";
import { useApi } from "../services/ApiService";
import { usePopup } from "../services/PopupService";

export const LoginForm = () => {
    const { login } = useApi();

    const { popupLoading } = usePopup();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    return (
        <main>
            <div className="main-container">
                <section className="start-form login">
                    <h1>Inicio de sesión</h1>

                    <div className="form-field">
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            name="roomName"
                            type="text"
                            placeholder="Usuario"
                        />
                    </div>

                    <div className="form-field">
                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            name="roomPassword"
                            type="password"
                            placeholder="Contraseña"
                        />
                    </div>

                    <button onClick={() => login(username, password)}>
                        Iniciar sesión
                    </button>
                </section>
            </div>
        </main>
    );
};

export default LoginForm;
