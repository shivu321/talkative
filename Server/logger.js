// logger.js
import fs from "fs";
import path from "path";

const logFile = path.join(process.cwd(), "server.log");

function log(message, type = "INFO") {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] [${type}] ${message}\n`;

    // Print to console
    if (type === "ERROR") console.error(logMsg);
    else if (type === "WARN") console.warn(logMsg);
    else if (type === "DEBUG") console.debug(logMsg);
    else console.log(logMsg);

    // Save to log file
    fs.appendFileSync(logFile, logMsg);
}

export default {
    info: (msg) => log(msg, "INFO"),
    error: (msg) => log(msg, "ERROR"),
    warn: (msg) => log(msg, "WARN"),
    debug: (msg) => log(msg, "DEBUG"), // 👈 added this
};
