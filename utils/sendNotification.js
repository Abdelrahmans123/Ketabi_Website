import Notification from "../models/Notification.js";
import { getIO, connectedSockets } from "../socketIO/index.js";

export const sendNotification = async ({
    userId,
    type,
    title,
    content,
    data,
}) => {
    const notification = await Notification.create({
        userId,
        type,
        title,
        content,
        data,
    });

    const io = getIO();
    const user = userId.toString();
    const sockets = connectedSockets.get(user);
    if (sockets) {
        io.to(sockets).emit("notification", notification);
    }

    return notification;
};
