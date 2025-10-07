import Book from '../models/BooksModel.js'
import AppError from "../utils/AppError.js";

export const  AddBook= async(req,res)=>{
try{
    const newbook =await Book.create(req.body);
    res.status(201).json(newbook);
}
catch(err){
        res.status(400).json({ message: err.message });
}


};
