require("dotenv").config()
const { default: mongoose } = require("mongoose");
const app = require("./app")

mongoose.connect(process.env.MONGODB_URI).then(()=>{
    console.log("MongoDb connected!");
})
.catch((error)=>{
console.log(error);
})

app.listen(process.env.PORT , ()=>{
    console.log(`server listen a port ${process.env.PORT} http://localhost:${process.env.PORT}`);
})