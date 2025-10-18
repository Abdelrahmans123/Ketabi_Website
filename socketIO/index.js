import { Server } from "socket.io";
import AppError from "../utils/AppError.js";
import { verifyJWT } from "../utils/jwt.js";
import { registerSocket } from "./Chat/ChatController.js";

let io;
export const connectedSockets = new Map();

export const initializeIO = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.use((socket, next) => {
        const authToken = socket.handshake.headers.authtoken;
        if (!authToken?.startsWith("Bearer ")) {
            return next(new AppError("Unauthorized", 401));
        }
        const token = authToken.split(" ")[1];
        if (authToken) {
            const user = verifyJWT(token);
            const userTabs = connectedSockets.get(user.id) || [];
            const isFirstConnection = userTabs.length === 0;
            userTabs.push(socket.id);
            connectedSockets.set(user.id, userTabs);
            socket.user = user;
            socket.isFirstConnection = isFirstConnection;
            return next();
        }
        next(new Error("invalid session"));
    });

    io.on("connection", (socket) => {
        console.log("a user connected");
        socket.join(socket.user.id);
        socket.emit("userStatus", {
            userId: socket.user.id,
            status: "online",
            name: socket.user.name,
        });
        if (socket.isFirstConnection) {
            socket.broadcast.emit("userStatusChanged", {
                userId: socket.user.id,
                status: "online",
                name: socket.user.name,
            });
        }
        socket.emit("systemMessage", {
            type: "welcome",
            message: `Hello ${socket.user.name}, welcome!`,
            timestamp: new Date().toISOString(),
        });
        if (socket.user.role === "admin") {
            io.emit("systemMessage", {
                type: "adminJoin",
                message: `Admin ${socket.user.name} has joined`,
                timestamp: new Date().toISOString(),
            });
        }
        registerSocket(socket, io);
        socket.on("disconnect", () => {
            console.log("user disconnected");
            const remainingUserTabs =
                connectedSockets
                    .get(socket.user.id)
                    ?.filter((tab) => tab !== socket.id) || [];
            if (remainingUserTabs?.length) {
                connectedSockets.set(socket.user.id, remainingUserTabs);
            } else {
                connectedSockets.delete(socket.user.id);
                io.emit("userStatusChanged", {
                    userId: socket.user.id,
                    status: "offline",
                    name: socket.user.name,
                });

                io.emit("userDisconnected", socket.user.id);
            }
            if (socket.user.role === "admin" && !remainingUserTabs.length) {
                io.emit("systemMessage", {
                    type: "adminLeave",
                    message: `Admin ${socket.user.name} has left`,
                    timestamp: new Date().toISOString(),
                });
            }
        });
    });
};

export const getIO = () => {
    if (!io) {
        throw new AppError("Socket.io not initialized");
    }
    return io;
};
