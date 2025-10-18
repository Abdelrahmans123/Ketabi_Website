import { sendMessageService, registerEventService } from "./eventService.js";

export const registerEvents = (socket) => {
    return socket.on("register", (msg, cb) => {
        registerEventService({ message: msg, socket, cb });
    });
};
export const sendMessage = (socket, io) => {
    return socket.on("message", ({ content, sendTo }) => {
        sendMessageService({ message: { content, sendTo }, socket, io });
    });
};
