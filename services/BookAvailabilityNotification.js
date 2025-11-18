import User from "../models/User.js";
import Book from "../models/Book.js";
import { sendNotification } from "../utils/sendNotification.js";
import { notificationType } from "../utils/notificationTypeEnum.js";
import { findAll, findById } from "../models/services/db.js";

export const notifyBookBackInStock = async (bookId) => {
    const book = await findById({ model: Book, id: bookId });
    if (!book || book.status !== "in stock") {
        return;
    }
    const users = await findAll({
        model: User,
        filter: { "wishlist.book": book._id },
        select: "_id name",
    });

    if (!users || users.length === 0) {
        return;
    }
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
};

export const notifyPriceDrop = async (bookId, oldPrice, newPrice) => {
    const book = await findById({ model: Book, id: bookId });
    console.log("🚀 ~ notifyPriceDrop ~ book:", book);
    if (!book) {
        console.log(`Book not found: ${bookId}`);
        return;
    }

    const discountPercentage = Math.round(
        ((oldPrice - newPrice) / oldPrice) * 100
    );

    // FIX: Query nested 'book' field in wishlist array
    const users = await findAll({
        model: User,
        query: { "wishlist.book": bookId }, // ✅ Changed from 'filter' and query nested field
        select: "_id name",
    });
    console.log("🚀 ~ notifyPriceDrop ~ users:", users);
    console.log(`Found ${users?.length || 0} users with book in wishlist`);

    if (!users || users.length === 0) {
        console.log(
            `No users have book ${book.name} in their wishlist for price drop`
        );
        return;
    }

    const notificationPromises = users.map((user) =>
        sendNotification({
            userId: user._id,
            type: notificationType.PRICE_DROP,
            title: "Price Drop Alert!",
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
};

export const notifyNewEdition = async (newBookId, authorName) => {
    const newBook = await findById({ model: Book, id: newBookId });
    if (!newBook) return;

    // FIX: Changed from 'filter' to 'query'
    const users = await findAll({
        model: User,
        query: {
            purchasedBooks: { $exists: true, $ne: [] },
        },
        select: "_id name purchasedBooks",
    });
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
            title: "New Edition Available!",
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
};

export const notifyLowStock = async (bookId) => {
    const book = await findById({ model: Book, id: bookId });
    if (!book || book.stock > 5) {
        return;
    }

    // FIX: Query nested 'book' field in wishlist array and change to 'query'
    const users = await findAll({
        model: User,
        query: { "wishlist.book": bookId }, // ✅ Changed from 'filter' and query nested field
        select: "_id name",
    });

    if (!users || users.length === 0) {
        return;
    }

    const notificationPromises = users.map((user) =>
        sendNotification({
            userId: user._id,
            type: notificationType.LOW_STOCK, // ✅ Fixed: Use correct notification type
            title: "Low Stock Alert!",
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
};
