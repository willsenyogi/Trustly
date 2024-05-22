const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const app = express();
const expressLayout = require('express-ejs-layouts');
const userController = require('./controller/userController');

app.use(express.static('public'));
app.use(express.json());
app.use(cors());
dotenv.config();
app.use(express.urlencoded({ extended: true }));

try{
    mongoose.connect(`${process.env.MONGO_URI}`);
    console.log(`Database connected : ${process.env.MONGO_URI}`);
} catch(error) {
    console.log("Error connecting to database",error);
}

// userController.addUser("willsenyogi", "willsenyogi@me.com", "willsenyogi");

app.use(expressLayout);
app.set('layout', './layouts/main');
app.set('view engine', 'ejs');

app.use('/', require('./routes/router.js'));
// app.use('/auth', require('./server/routes/auth'));



app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));