import React, { createContext, useContext, useEffect, useState } from "react";

const PopupContext = createContext();

export const PopupService = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);

    const [params, setParams] = useState({});

    const [title, setTitle] = useState("");
    const [msg, setMsg] = useState("");
    const [type, setType] = useState("confirm");
    const [finished, setFinished] = useState(true);

    const closePopup = () => {
        setIsOpen(false);
    };

    const popupConfirm = (title, msg, callback) => {
        setIsOpen(true);
        setTitle(title);
        setMsg(msg);
        setParams({ callback });
        setType("confirm");
    };

    const popupAlert = (title, msg) => {
        setIsOpen(true);
        setTitle(title);
        setMsg(msg);
        setType("alert");
    };

    const popupLoading = (title, msg) => {
        setIsOpen(true);
        setTitle(title);
        setMsg(msg);
        setFinished(false);
        setType("loading");

        return { setIsOpen };
    };

    const popupKickban = (title, msg, id) => {
        setIsOpen(true);
        setTitle(title);
        setMsg(msg);
        setParams({ id });
        setType("kickban");
    };

    useEffect(() => {
        if (!isOpen) {
            setTitle("");
            setMsg("");
            setType("confirm");
        }
    }, [isOpen]);

    return (
        <PopupContext.Provider
            value={{
                params,

                isOpen,
                setIsOpen,
                closePopup,

                type,
                title,
                msg,
                finished,

                setTitle,
                setMsg,
                setFinished,

                popupConfirm,
                popupAlert,
                popupLoading,
                popupKickban,
            }}
        >
            {children}
        </PopupContext.Provider>
    );
};

export const usePopup = () => {
    return useContext(PopupContext);
};

export default PopupService;
