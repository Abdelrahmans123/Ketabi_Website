import { GoogleGenerativeAI } from "@google/generative-ai";
import Book from "../models/Book.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class RAGChatbot {
  constructor() {
    this.chatModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });
  }

  detectLanguage(text) {
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text) ? "ar" : "en";
  }

  getLabels(language) {
    if (language === "en") {
      return {
        author: "Author",
        category: "Category",
        price: "EGP",
        discount: "Discount",
        rating: "Rating",
        reviews: "reviews",
        available: "Available",
        details: "Details",
        noResults: "Sorry, no books found.",
        noResultsUnder: (price) => `Sorry, no books under ${price} EGP.`,
        noResultsOver: (price) => `Sorry, no books over ${price} EGP.`,
      };
    } else {
      return {
        author: "المؤلف",
        category: "التصنيف",
        price: "جنيه",
        discount: "خصم",
        rating: "التقييم",
        reviews: "تقييم",
        available: "متوفر",
        details: "التفاصيل",
        noResults: "عذراً، لم نجد كتب.",
        noResultsUnder: (price) => `عذراً، لم نجد كتب أقل من ${price} جنيه.`,
        noResultsOver: (price) => `عذراً، لم نجد كتب أكثر من ${price} جنيه.`,
      };
    }
  }

  async analyzePriceIntentAdvanced(userMessage) {
    try {
      const prompt = `حلّل هذا السؤال عن الكتب واستخرج:
            1. هل المستخدم يريد كتب رخيصة أو غالية؟
            2. ما الحد الأقصى/الأدنى للسعر؟

            السؤال: "${userMessage}"

            أجب بهذا الشكل فقط (3 أسطر):
            priceMode: cheap/expensive/neutral
            minPrice: رقم أو null
            maxPrice: رقم أو null`;

      const result = await this.chatModel.generateContent(prompt);
      const responseText = result.response.text().trim();

      console.log(" Gemini Analysis:", responseText);

      const lines = responseText.split("\n");
      let priceMode = "neutral";
      let minPrice = null;
      let maxPrice = null;

      lines.forEach((line) => {
        if (line.includes("priceMode:")) {
          priceMode = line.includes("cheap")
            ? "cheap"
            : line.includes("expensive")
            ? "expensive"
            : "neutral";
        }
        if (line.includes("minPrice:")) {
          const num = parseInt(line.match(/\d+/)?.[0]);
          minPrice = !isNaN(num) ? num : null;
        }
        if (line.includes("maxPrice:")) {
          const num = parseInt(line.match(/\d+/)?.[0]);
          maxPrice = !isNaN(num) ? num : null;
        }
      });

      return { priceMode, minPrice, maxPrice };
    } catch (error) {
      console.error(" Gemini analysis failed:", error.message);
      return this.detectPriceFallback(userMessage);
    }
  }

  detectPriceFallback(userMessage) {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes("رخيص") || lowerMessage.includes("cheap")) {
      return { priceMode: "cheap", minPrice: null, maxPrice: 100 };
    }
    if (
      lowerMessage.includes("غالي") ||
      lowerMessage.includes("اغلي") ||
      lowerMessage.includes("expensive")
    ) {
      return { priceMode: "expensive", minPrice: 150, maxPrice: null };
    }

    return { priceMode: "neutral", minPrice: null, maxPrice: null };
  }

  async extractKeywords(userMessage) {
    try {
      const prompt = `استخرج الكلمات المفتاحية للبحث:
        "${userMessage}"

        استخرج فقط: نوع الكتاب أو الموضوع
        بدون: أسعار أو كلمات مثل "رخيص"

        أعط الكلمات مفصولة بفاصلة فقط.`;

      const result = await this.chatModel.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      return userMessage;
    }
  }

  async translateKeywords(keywords, fromLang, toLang) {
    try {
      const prompt = `ترجم: "${keywords}"
        من ${fromLang === "en" ? "الإنجليزية" : "العربية"} إلى ${
        toLang === "ar" ? "العربية" : "الإنجليزية"
      }
        ترجم فقط، مفصول بفاصلة.`;

      const result = await this.chatModel.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      return keywords;
    }
  }

  async searchBooks(keywords, translatedKeywords, minPrice, maxPrice) {
    try {
      const allSearchTerms = [
        ...keywords.split(/[,،\s]+/).filter((k) => k.length > 2),
        ...translatedKeywords.split(/[,،\s]+/).filter((k) => k.length > 2),
      ];

      const uniqueTerms = [...new Set(allSearchTerms)];

      console.log(" البحث :", uniqueTerms);

      const query = {
        $or: uniqueTerms.flatMap((term) => [
          { name: { $regex: term, $options: "i" } },
          { categoryName: { $regex: term, $options: "i" } },
          { author: { $regex: term, $options: "i" } },
          { description: { $regex: term, $options: "i" } },
        ]),
      };

      let books = await Book.find(query)
        .select(
          "name author categoryName price discount avgRating ratingsCount stock _id"
        )
        .limit(100);

      books = books.map((book) => ({
        ...book.toObject(),
        finalPrice: Math.round(book.price * (1 - book.discount / 100)),
      }));

      if (minPrice !== null) {
        books = books.filter((book) => book.finalPrice >= minPrice);
      }
      if (maxPrice !== null) {
        books = books.filter((book) => book.finalPrice <= maxPrice);
      }

      return books;
    } catch (error) {
      console.error(" Search error:", error);
      return [];
    }
  }

  rankBooks(books, priceMode) {
    if (priceMode === "cheap") {
      return books.sort((a, b) => a.finalPrice - b.finalPrice).slice(0, 3);
    } else if (priceMode === "expensive") {
      return books.sort((a, b) => b.finalPrice - a.finalPrice).slice(0, 3);
    } else {
      return books
        .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
        .slice(0, 3);
    }
  }

  async generateSmartResponse(
    userMessage,
    books,
    language,
    priceMode,
    minPrice,
    maxPrice
  ) {
    try {
      const labels = this.getLabels(language);

      if (books.length === 0) {
        if (maxPrice) {
          return labels.noResultsUnder(maxPrice);
        } else if (minPrice) {
          return labels.noResultsOver(minPrice);
        } else {
          return labels.noResults;
        }
      }

      const context = books
        .map(
          (b) =>
            `- ${b.name} (${b.author}) [${b.categoryName}] - ${b.finalPrice} ${
              labels.price
            } - ⭐${b.avgRating?.toFixed(1)}/5`
        )
        .join("\n");

      try {
        const prompt = `أنت مساعد ذكي لمتجر كتب.

            السؤال: "${userMessage}"
            الكتب:
            ${context}

        قدم رد قصير (سطر واحد) باللغة ${
          language === "en" ? "الإنجليزية" : "العربية"
        }.`;

        const result = await this.chatModel.generateContent(prompt);
        return result.response.text().trim();
      } catch (err) {
        return language === "en"
          ? "Found great books for you!"
          : "وجدت لك كتب رائعة!";
      }
    } catch (error) {
      return language === "en" ? "Found books!" : "وجدت لك كتب!";
    }
  }

  formatResponse(message, books, language) {
    const labels = this.getLabels(language);
    let response = message + "\n\n";

    if (books.length > 0) {
      response += "---\n\n";
      books.forEach((book, i) => {
        const discountText =
          language === "en"
            ? `${labels.discount}: ${book.discount}%`
            : `${labels.discount} ${book.discount}%`;

        response += `${i + 1}. ${book.name}\n`;
        response += `${labels.author}: ${book.author}\n`;
        response += `${labels.category}: ${book.categoryName}\n`;
        response += `${book.finalPrice} ${labels.price} (${discountText})\n`;
        response += `${book.avgRating?.toFixed(1)}/5 (${
          book.ratingsCount
        } ${labels.reviews})\n`;
        response += `${labels.available}: ${book.stock}\n`;
        response += `[${labels.details}](http://localhost:3000/api/books/Get-Book/${book._id})\n\n`;
      });
    }

    return response;
  }

  async chat(userMessage) {
    try {
      console.log(" السؤال:", userMessage);

      const language = this.detectLanguage(userMessage);
      console.log(` اللغة: ${language === "en" ? "English" : "Arabic"}`);

      const { priceMode, minPrice, maxPrice } =
        await this.analyzePriceIntentAdvanced(userMessage);

      const keywords = await this.extractKeywords(userMessage);

      const translatedKeywords = await this.translateKeywords(
        keywords,
        language,
        language === "en" ? "ar" : "en"
      );

      const books = await this.searchBooks(
        keywords,
        translatedKeywords,
        minPrice,
        maxPrice
      );

      const rankedBooks = this.rankBooks(books, priceMode);

      console.log(
        " النتائج:",
        rankedBooks.map((b) => `${b.name} (${b.finalPrice})`)
      );

      const aiMessage = await this.generateSmartResponse(
        userMessage,
        rankedBooks,
        language,
        priceMode,
        minPrice,
        maxPrice
      );

      const finalResponse = this.formatResponse(
        aiMessage,
        rankedBooks,
        language
      );

      return {
        response: finalResponse,
        metadata: {
          keywords: keywords,
          priceMode: priceMode,
          minPrice: minPrice,
          maxPrice: maxPrice,
          language: language,
          resultsCount: rankedBooks.length,
        },
      };
    } catch (error) {
      console.error(" Chat error:", error);
      return {
        response: "عذراً، حدث خطأ. حاول مرة أخرى. / Sorry, an error occurred.",
        metadata: { error: true },
      };
    }
  }
}

export default new RAGChatbot();
