module.exports = {
    apps: [
        {
            name: "Sala X4",
            script: "./roomMgr.js",
            args: "--port=42925",
            instances: "1",
            exec_mode: "cluster",
        },
        {
            name: "Sala X5",
            script: "./roomMgr.js",
            args: "--port=42926",
            instances: "1",
            exec_mode: "cluster",
        },
    ],
};
