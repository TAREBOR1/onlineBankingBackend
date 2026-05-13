const mongoose= require('mongoose');
mongoose.connect(process.env.CONN_STR);

const db= mongoose.connection;

db.on('connected',()=>{
    console.log('database connected successfully')
});

db.on('error',(error)=>{
    console.log('error connecting to databse:',error);
})

module.exports=db;