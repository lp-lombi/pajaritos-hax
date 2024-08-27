import React, { useEffect } from "react";
import App from "./routes/App";
import Login from "./routes/Login";
import { useApi } from "./services/ApiService";
import Popup from "./components/Popup";

export const Router = () => {
    const { apiToken, setApiToken } = useApi();

    useEffect(() => {
        if (localStorage.getItem("token")) {
            setApiToken(localStorage.getItem("token"));
        }
    }, []);

    return (
        <>
            <Popup />
            {apiToken ? <App /> : <Login />}
        </>
    );
};

export default Router;
