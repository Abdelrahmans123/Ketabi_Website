import express  from 'express';
import {AddBook} from '../controllers/BookController.js';


const router=express.Router();

router.post('/Create-Book',AddBook);

export default router;