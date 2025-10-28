import User from "../models/User.js";
import Book from "../models/Book.js";
import { sendNotification } from "../utils/sendNotification.js";
import { notificationType } from "../utils/notificationTypeEnum.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Notify users when a book is back in stock
 * @param {String} bookId - The ID of the book that's back in stock
 */
export const notifyBookBackInStock = asyncHandler(async (bookId) => {
    const book = await Book.findById(bookId);
    if (!book || book.status !== "in stock") {
        return;
    }

    // Find all users who have this book in their wishlist
    const users = await User.find({
        wishlist: bookId,
    }).select("_id name");

    if (!users || users.length === 0) {
        console.log(`No users have book ${book.name} in their wishlist`);
        return;
    }

    // Send notification to each user
    const notificationPromises = users.map((user) =>
        sendNotification({
            userId: user._id,
            type: notificationType.BOOK_BACK_IN_STOCK,
            title: "Book Back in Stock!",
            content: `Great news! "${book.name}" by ${book.author} is back in stock. Get it before it's gone!`,
            data: {
                bookId: book._id,
                bookName: book.name,
                author: book.author,
                price: book.price,
                discount: book.discount,
                finalPrice: book.finalPrice,
                stock: book.stock,
                coverImage: book.image?.url,
            },
        })
    );

    await Promise.all(notificationPromises);
    console.log(
        `Sent back-in-stock notifications to ${users.length} users for book: ${book.name}`
    );
});

/**
 * Notify users when a book price drops
 * @param {String} bookId - The ID of the book
 * @param {Number} oldPrice - The old price
 * @param {Number} newPrice - The new price
 */
export const notifyPriceDrop = asyncHandler(
    async (bookId, oldPrice, newPrice) => {
        const book = await Book.findById(bookId);
        if (!book) return;

        // Calculate discount percentage
        const discountPercentage = Math.round(
            ((oldPrice - newPrice) / oldPrice) * 100
        );

        // Find users who have this book in wishlist or cart
        const users = await User.find({
            wishlist: bookId,
        }).select("_id name");

        if (!users || users.length === 0) {
            return;
        }

        const notificationPromises = users.map((user) =>
            sendNotification({
                userId: user._id,
                type: notificationType.PRICE_DROP,
                title: "💰 Price Drop Alert!",
                content: `"${book.name}" price dropped by ${discountPercentage}%! Was ${oldPrice} EGP, now only ${newPrice} EGP.`,
                data: {
                    bookId: book._id,
                    bookName: book.name,
                    author: book.author,
                    oldPrice,
                    newPrice,
                    discountPercentage,
                    savings: oldPrice - newPrice,
                    coverImage: book.image?.url,
                },
            })
        );

        await Promise.all(notificationPromises);
        console.log(
            `Sent price drop notifications to ${users.length} users for book: ${book.name}`
        );
    }
);

/**
 * Notify users when a new edition of a book they own is available
 * @param {String} newBookId - The ID of the new edition
 * @param {String} oldBookName - Name to match with previous editions
 */
export const notifyNewEdition = asyncHandler(async (newBookId, authorName) => {
    const newBook = await Book.findById(newBookId);
    if (!newBook) return;

    // Find users who have purchased books by the same author
    const users = await User.find({
        purchasedBooks: { $exists: true, $ne: [] },
    })
        .populate({
            path: "purchasedBooks",
            match: { author: authorName },
            select: "_id name author",
        })
        .select("_id name purchasedBooks");

    // Filter users who actually have books by this author
    const interestedUsers = users.filter(
        (user) => user.purchasedBooks && user.purchasedBooks.length > 0
    );

    if (interestedUsers.length === 0) {
        return;
    }

    const notificationPromises = interestedUsers.map((user) =>
        sendNotification({
            userId: user._id,
            type: notificationType.NEW_EDITION,
            title: "📖 New Edition Available!",
            content: `A new edition of "${newBook.name}" by ${newBook.author} is now available. Check it out!`,
            data: {
                bookId: newBook._id,
                bookName: newBook.name,
                author: newBook.author,
                edition: newBook.Edition,
                price: newBook.price,
                coverImage: newBook.image?.url,
            },
        })
    );

    await Promise.all(notificationPromises);
    console.log(
        `Sent new edition notifications to ${interestedUsers.length} users for book: ${newBook.name}`
    );
});

/**
 * Check if user should be notified about low stock
 * @param {String} bookId - The ID of the book
 */
export const notifyLowStock = asyncHandler(async (bookId) => {
    const book = await Book.findById(bookId);
    if (!book || book.stock > 5) {
        return; // Only notify if stock is 5 or less
    }

    const users = await User.find({
        wishlist: bookId,
    }).select("_id name");

    if (!users || users.length === 0) {
        return;
    }

    const notificationPromises = users.map((user) =>
        sendNotification({
            userId: user._id,
            type: notificationType.BOOK_BACK_IN_STOCK,
            title: "⚠️ Low Stock Alert!",
            content: `Only ${book.stock} copies left of "${book.name}"! Order now before it's too late.`,
            data: {
                bookId: book._id,
                bookName: book.name,
                author: book.author,
                stock: book.stock,
                price: book.price,
                coverImage: book.image?.url,
            },
        })
    );

    await Promise.all(notificationPromises);
    console.log(
        `Sent low stock notifications to ${users.length} users for book: ${book.name}`
    );
});
