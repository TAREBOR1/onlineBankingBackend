const express = require('express')
const app=express();
const cors=require('cors');
const transactionRoute = require('./routes/transaction');
const authRoute = require('./routes/auth');
const accountRoute = require('./routes/account');
const dashboardRoute = require('./routes/dashboard');
const notificationRoute = require('./routes/notification');
const kycRoute = require('./routes/kyc');
const cardRoute = require('./routes/card');
const userRoute = require('./routes/user');
const walletRoute = require('./routes/wallet');



app.use(express.urlencoded({ extended: true })); 
app.use(express.json())



app.use(cors({
    origin: [process.env.CLIENT_URL],
    methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    exposedHeaders: ['set-cookie']
}));

app.set('trust proxy',1)




app.use('/api/user',authRoute)
app.use('/api/transaction',transactionRoute)
app.use('/api/account',accountRoute)
app.use('/api/dashboard',dashboardRoute)
app.use('/api/notifications',notificationRoute)
app.use('/api/kyc',kycRoute)
app.use('/api/cards',cardRoute)
app.use('/api/profile',userRoute)



// admin side
app.use('/api/admin/cards',cardRoute)
app.use('/api/admin/account',accountRoute)
app.use('/api/admin/profile',userRoute)
app.use('/api/admin/kyc',kycRoute)
app.use('/api/admin/wallet',walletRoute)
app.use('/api/admin/transaction',transactionRoute)



app.get('/', (req, res) => {
  res.send('Hello World!');
});

module.exports=app
