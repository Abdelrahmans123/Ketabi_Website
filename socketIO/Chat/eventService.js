import { findOne, findOneAndUpdate } from "../../models/services/db.js";
import Ticket from "../../models/Ticket.js";
import User from "../../models/User.js";
import AppError from "../../utils/AppError.js";
import { roleEnum } from "../../utils/roleEnum.js";
import { connectedSockets } from "../index.js";

export const registerEventService = ({ message, socket, cb }) => {
    try {
        console.log(
            `User with ID: ${socket.user.id} registered on socket ${socket.id} with message: ${message}`
        );
        if (cb) {
            cb({ status: "success", message: "User registered successfully" });
        }
    } catch (err) {
        socket.emit("error", { message: err.message });
    }
};
export const sendMessageService = async ({ message, socket, io }) => {
    try {
        const senderId = socket.user.id;
        const recipientId = message.sendTo;
        const sender = socket.user;
        console.log(
            `Message from user ID: ${senderId} (role: ${sender.role}) to ${recipientId} with content: ${message.content}`
        );
        let chat;
        if (sender.role !== roleEnum.admin) {
            const admin = await findOne(User, {
                _id: recipientId,
                role: roleEnum.admin,
            });
            if (!admin) {
                throw new AppError("Recipient must be an admin", 403);
            }
            chat = await findOneAndUpdate(
                Ticket,
                { users: { $all: [senderId, recipientId] } },
                {
                    $push: {
                        messages: {
                            sender: senderId,
                            text: message.content,
                            createdBy: senderId,
                            createdAt: new Date(),
                        },
                    },
                },
                { new: true }
            );
            if (!chat) {
                chat = await Ticket.create({
                    users: [senderId, recipientId],
                    subject: "New Chat",
                    createdBy: senderId,
                    messages: [
                        {
                            sender: senderId,
                            text: message.content,
                            createdBy: senderId,
                            createdAt: new Date(),
                        },
                    ],
                });
            }
        } else {
            chat = await findOneAndUpdate(
                Ticket,
                { users: { $all: [senderId, recipientId] } },
                {
                    $push: {
                        messages: {
                            sender: senderId,
                            text: message.content,
                            createdBy: senderId,
                            createdAt: new Date(),
                        },
                    },
                },
                { new: true }
            );
            if (!chat) {
                throw new AppError(
                    "Admin can only respond to existing conversations",
                    403
                );
            }
        }
        io.to(senderId).emit("successMessage", {
            content: message.content,
            sendTo: recipientId,
            from: senderId,
        });
        io.to(recipientId).emit("newMessage", {
            content: message.content,
            sendTo: recipientId,
            from: senderId,
        });
    } catch (err) {
        socket.emit("error", { message: err.message });
    }
};
