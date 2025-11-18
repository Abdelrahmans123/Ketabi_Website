import { MongoClient } from "mongodb";
import { generateBookEmbedding } from "../chatbot/services/embeddings.js";
import dotenv from "dotenv";

dotenv.config();


const generateAllBookEmbeddings = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("MONGO_URI not set in .env");
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    console.log("Connecting to MongoDB Atlas...");
    await client.connect();
    const db = client.db(); 
    const booksCollection = db.collection(
      process.env.BOOK_COLLECTION || "books"
    );


    const books = await booksCollection
      .find({ embedding: { $exists: false } })
      .toArray();

    console.log(`Found ${books.length} books without embeddings`);

    if (books.length === 0) {
      console.log("All books already have embeddings!");
      await client.close();
      process.exit(0);
    }

  
    const batchSize = 10;
    let processed = 0;

    for (let i = 0; i < books.length; i += batchSize) {
      const batch = books.slice(i, i + batchSize);

      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          books.length / batchSize
        )}...`
      );

      const updates = await Promise.all(
        batch.map(async (book) => {
          try {
            const embedding = await generateBookEmbedding(book);

            return {
              updateOne: {
                filter: { _id: book._id },
                update: { $set: { embedding } },
              },
            };
          } catch (error) {
            console.error(
              `Error for book ${book.name || book._id}:`,
              error.message || error
            );
            return null;
          }
        })
      );

      const validUpdates = updates.filter((u) => u !== null);

      if (validUpdates.length > 0) {
        await booksCollection.bulkWrite(validUpdates);
        processed += validUpdates.length;
        console.log(`Processed ${processed}/${books.length} books`);
      }

  
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`Successfully generated embeddings for ${processed} books!`);
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    try {
      await client.close();
    } catch (e) {
      
    }
    process.exit(1);
  }
};

generateAllBookEmbeddings();
