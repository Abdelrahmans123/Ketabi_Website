// events.js - FIXED VERSION
import { sendMessageService, registerEventService } from "./eventService.js";

export const registerEvents = (socket) => {
    // Backend expects just the message string directly
    return socket.on("register", (msg, cb) => {
        registerEventService({ message: msg, socket, cb });
    });
};

// FIXED: Changed event name from "message" to "sendMessage" to match Angular client
export const sendMessage = (socket, io) => {
    return socket.on("sendMessage", ({ content, sendTo }) => {
        console.log(
            `Received sendMessage event - content: ${content}, sendTo: ${sendTo}`
        );
        sendMessageService({ message: { content, sendTo }, socket, io });
    });
};

// Typing indicator event handler
export const handleTyping = (socket, io) => {
    return socket.on("typing", ({ recipientId, isTyping }) => {
        console.log(
            `User ${socket.user.id} is ${
                isTyping ? "typing" : "stopped typing"
            } to ${recipientId}`
        );

        // Emit to the recipient's room
        socket.to(recipientId).emit("userTyping", {
            userId: socket.user.id,
            userName: socket.user.name,
            isTyping,
        });
    });
};
