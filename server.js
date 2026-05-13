const dotenv=require('dotenv')
dotenv.config({path:'./.env'});
const port=process.env.PORT
const database=require('./config/dbconfig')
const app=require('./app')



app.listen(port,()=>{
    console.log("server is connecting to:",port)
})