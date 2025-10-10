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

export const  getBooks= async(req,res)=>{
try{
    const books =await Book.find();
    res.status(201).json(books);
}
catch(err){
        res.status(400).json({ message: err.message });
}


};





export const getBookByID=async(req,res)=>{
    try{
        
        const book=await Book.findById(req.params.id)
        if(!book){
            return res.status(400).json({message:"Book Not Found"});
        }
        res.status(200).json(book);

    }
    catch(err){
                res.status(400).json({ message: err.message });

    }
}



export const updateBook=async(req,res)=>{
    try{
            const { id } = req.params;
        const ubook=await Book.updateOne({_id:id},req.body,{new:true,runValidators:true});
        if(!ubook){
            return res.status(400).json({message:"Book Not Found"});
        }
        

        res.status(200).json(ubook);

    }
    catch(err){
                res.status(400).json({ message: err.message });

    }
}


export const deleteBook=async(req,res)=>{
    try{
            const { id } = req.params;
        const dbook=await Book.deleteOne({_id:id});
        if(!dbook.deletedCount==0){
            return res.status(400).json({message:"Book Not Found"});
        }
        

        res.status(200).json({message:"Book deleted Successfully"});

    }
    catch(err){
                res.status(400).json({ message: err.message });

    }
}


