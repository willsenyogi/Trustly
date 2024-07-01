const mongoose = require("mongoose");
const User = require("../model/user");

function addUser(username, email, password){
    try{
        User.insertMany({username, email, password});
        console.log(`user ${username} added`);
    } catch (error){
        console.log(error);
    }
    
    
}

module.exports = {addUser}