import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ApiService from "./services/ApiService.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    //<React.StrictMode>
    <ApiService>
        <App />
    </ApiService>
    //</React.StrictMode>
);
