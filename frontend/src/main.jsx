import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ApiService from "./services/ApiService.jsx";
import PopupService from "./services/PopupService.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    //<React.StrictMode>
    <PopupService>
        <ApiService>
            <App />
        </ApiService>
    </PopupService>

    //</React.StrictMode>
);
