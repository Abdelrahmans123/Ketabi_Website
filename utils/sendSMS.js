import TelegramBot from "node-telegram-bot-api";

// Initialize bot (polling disabled for webhook/API mode)


const bot = () => {
    return new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
        polling: false,
    });
};
/**
 * Send OTP via Telegram
 * @param {Object} params - Parameters object
 * @param {string} params.chatId - User's Telegram chat ID
 * @param {string} params.otp - One-time password
 * @returns {Promise<Object>} - Telegram message response
 */
export const sendTelegram = async ({ chatId, otp }) => {
    if (!chatId) {
        throw new Error("Telegram chat ID is required");
    }

    if (!otp) {
        throw new Error("OTP is required");
    }

    try {
        const message =
            `🔐 *Your Verification Code*\n\n` +
            `Code: \`${otp}\`\n\n` +
            `⏱ This code will expire in 10 minutes\n` +
            `⚠️ Never share this code with anyone!\n\n` +
            `If you didn't request this code, please ignore this message.`;

        const response = await bot().sendMessage(chatId, message, {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
        });

        console.log("✅ Telegram OTP sent successfully:", {
            messageId: response.message_id,
            chatId: response.chat.id,
            timestamp: new Date(response.date * 1000).toISOString(),
        });

        return response;
    } catch (error) {
        console.error("❌ Telegram OTP Error:", {
            error: error.message,
            code: error.code,
            chatId,
        });

        // Handle specific Telegram errors
        if (error.response?.body?.error_code === 403) {
            throw new Error("User has blocked the bot or chat not found");
        } else if (error.response?.body?.error_code === 400) {
            throw new Error("Invalid chat ID or message format");
        }

        throw new Error(error.message || "Failed to send OTP via Telegram");
    }
};

// Export bot instance for setting up listeners elsewhere
export { bot };
