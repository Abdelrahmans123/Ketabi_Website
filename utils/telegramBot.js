import TelegramBot from 'node-telegram-bot-api';
import { findOne, updateOne } from '../models/services/db.js';
import User from '../models/User.js';

// Initialize bot with polling enabled
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
    polling: true 
});


console.log('🤖 Telegram bot started...');

// Handle /start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    const firstName = msg.from.first_name;
    
    const welcomeMessage = 
        `👋 Welcome ${firstName}!\n\n` +
        `🔐 This bot will send you verification codes.\n\n` +
        `📝 Your Chat ID: \`${chatId}\`\n` +
        (username ? `👤 Username: @${username}\n\n` : '\n') +
        `✅ To link your account:\n` +
        `1. Copy your Chat ID above\n` +
        `2. Enter it during registration on our app\n` +
        `3. You'll receive verification codes here\n\n` +
        `💡 Keep this chat active to receive OTP codes!`;
    
    try {
        await bot.sendMessage(chatId, welcomeMessage, {
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
});

// Handle /myid command
bot.onText(/\/myid/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    
    const idMessage = 
        `📋 *Your Telegram Information*\n\n` +
        `🆔 Chat ID: \`${chatId}\`\n` +
        (username ? `👤 Username: @${username}\n` : '') +
        `\n💡 Use this Chat ID to register or link your account.`;
    
    await bot.sendMessage(chatId, idMessage, {
        parse_mode: 'Markdown'
    });
});

// Handle /verify command with verification code
bot.onText(/\/verify (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const verificationCode = match[1];
    
    try {
        // Find user with this verification code
        const user = await findOne({
            model: User,
            query: { 
                telegramVerificationCode: verificationCode,
                telegramVerificationExpires: { $gt: Date.now() }
            }
        });
        
        if (!user) {
            await bot.sendMessage(chatId, 
                '❌ Invalid or expired verification code.\n\n' +
                'Please generate a new code from the app.'
            );
            return;
        }
        
        // Update user with chat ID
        await updateOne({
            model: User,
            query: { _id: user._id },
            data: {
                telegramChatId: chatId.toString(),
                telegramUsername: msg.from.username,
                isTelegramVerified: true,
                telegramVerificationCode: null,
                telegramVerificationExpires: null
            }
        });
        
        await bot.sendMessage(chatId, 
            '✅ *Account Linked Successfully!*\n\n' +
            '🎉 Your Telegram account is now connected.\n' +
            'You will receive OTP codes here for verification.\n\n' +
            '🔐 Keep this chat to stay secure!',
            { parse_mode: 'Markdown' }
        );
        
    } catch (error) {
        console.error('Verification error:', error);
        await bot.sendMessage(chatId, 
            '❌ An error occurred during verification.\n' +
            'Please try again or contact support.'
        );
    }
});

// Handle /help command
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    
    const helpMessage = 
        `📚 *Available Commands*\n\n` +
        `/start - Start the bot and get your Chat ID\n` +
        `/myid - Get your Chat ID\n` +
        `/verify <code> - Link your account with verification code\n` +
        `/help - Show this help message\n\n` +
        `💡 *How to use:*\n` +
        `1. Get your Chat ID using /myid\n` +
        `2. Enter it during registration\n` +
        `3. Receive OTP codes automatically`;
    
    await bot.sendMessage(chatId, helpMessage, {
        parse_mode: 'Markdown'
    });
});

// Handle errors
bot.on('polling_error', (error) => {
    console.error('Telegram polling error:', error);
});

// Export bot instance
export default bot;