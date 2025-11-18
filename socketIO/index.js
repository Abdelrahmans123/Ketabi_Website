
import { Server } from "socket.io";
import AppError from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { registerSocket } from "./Chat/ChatController.js";

let io;
export const connectedSockets = new Map();

export const connectedUsersInfo = new Map(); 

export const initializeIO = (server) => {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:4200",
            methods: ["GET", "POST"],
            credentials: true,
            allowedHeaders: ["authtoken"],
        },
    });
    io.use((socket, next) => {
        try {
            const authToken = socket.handshake.headers.authtoken;
            console.log("Received authToken:", socket.handshake.headers);
            if (!authToken || !authToken.startsWith("Bearer ")) {
                console.error("Missing or invalid token format");
                return next(new Error("Unauthorized"));
            }
            const token = authToken.split(" ")[1];

            if (!token) {
                console.error("Token is empty after splitting");
                return next(new Error("Unauthorized"));
            }
            const user = verifyAccessToken(token);

            if (!user || !user.id) {
                console.error("Invalid user from token");
                return next(new Error("Unauthorized"));
            }
            const userTabs = connectedSockets.get(user.id) || [];
            const isFirstConnection = userTabs.length === 0;
            userTabs.push(socket.id);
            connectedSockets.set(user.id, userTabs);
            if (!connectedUsersInfo.has(user.id)) {
                connectedUsersInfo.set(user.id, {
                    name: user.name,
                    role: user.role,
                });
            }
            socket.user = user;
            socket.isFirstConnection = isFirstConnection;

            console.log(`User ${user.id} authenticated successfully`);
            next();
        } catch (err) {
            console.error("Authentication error:", err.message);
            return next(new Error("Unauthorized"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`User ${socket.user.id} connected`);
        socket.join(socket.user.id);
        socket.emit("userStatus", {
            userId: socket.user.id,
            status: "online",
            name: socket.user.name,
        });
        for (const [uid, info] of connectedUsersInfo.entries()) {
            if (uid === socket.user.id) continue;
            socket.emit("userStatus", {
                userId: uid,
                status: "online",
                name: info.name,
            });
        }
        if (socket.isFirstConnection) {
            socket.broadcast.emit("userStatusChanged", {
                userId: socket.user.id,
                status: "online",
                name: socket.user.name,
            });
        }

        if (socket.user.role === "admin") {
            for (const [userId, socketIds] of connectedSockets.entries()) {
                if (userId !== socket.user.id && socketIds.length > 0) {
                    const cached = connectedUsersInfo.get(userId);
                    socket.emit("userStatusChanged", {
                        userId,
                        status: "online",
                        name: cached?.name || "",
                    });
                }
            }
        }

        socket.emit("systemMessage", {
            type: "welcome",
            message: `Hello ${socket.user.name}, welcome!`,
            timestamp: new Date().toISOString(),
        });

        if (socket.user.role === "admin") {
            for (const [uid, tabs] of connectedSockets.entries()) {
                if (uid === socket.user.id) continue; 
                const info = connectedUsersInfo.get(uid);
                if (info?.role !== "admin") {
                    tabs.forEach((tabId) => {
                        io.to(tabId).emit("systemMessage", {
                            type: "adminJoin",
                            message: `Admin ${socket.user.name} has joined`,
                            timestamp: new Date().toISOString(),
                        });
                    });
                }
            }
        }
        if (socket.user.role !== "admin") {
            for (const [uid, info] of connectedUsersInfo.entries()) {
                if (info.role === "admin") {
                    socket.emit("systemMessage", {
                        type: "adminJoin",
                        message: `Admin ${info.name} has joined`,
                        timestamp: new Date().toISOString(),
                    });
                    break;
                }
            }
        }
        registerSocket(socket, io);
        socket.on("disconnect", () => {
            console.log(`User ${socket.user.id} disconnected`);
            const remainingUserTabs =
                connectedSockets
                    .get(socket.user.id)
                    ?.filter((tab) => tab !== socket.id) || [];
            if (remainingUserTabs?.length) {
                connectedSockets.set(socket.user.id, remainingUserTabs);
            } else {
                connectedSockets.delete(socket.user.id);
                connectedUsersInfo.delete(socket.user.id);
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
