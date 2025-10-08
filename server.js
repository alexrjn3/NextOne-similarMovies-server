import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config({path: './config.env'});


import app from './app.js';
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
mongoose.connect(DB,{
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(con => {
  //console.log(con.connections);
  console.log('DB connection succesfull!');
}).catch((err) => console.error('DB connection error:', err));


//console.log(process.env);
// START SERVER
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
