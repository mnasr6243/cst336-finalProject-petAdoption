import express from 'express';
import mysql from 'mysql2/promise';

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));

//for Express to get values using the POST method
app.use(express.urlencoded({extended:true}));

//setting up database connection pool
const pool = mysql.createPool({
    host: "dyud5fa2qycz1o3v.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "tzn68o0wbq4ozrye",
    password: "t5ftnpkmmygiq3i2",
    database: "xevoz15vpgd3tss2",
    connectionLimit: 10,
    waitForConnections: true
});

//routes
app.get('/', async (req, res) => {
    let randomDog = await fetch("https://dog.ceo/api/breeds/image/random/10");
    let randomDogData = await randomDog.json();

    console.log(randomDogData);

    let randomDogUrlArray = [];
    let randomNumberArray = [];
    for (let i = 0 ; i < randomDogData.message.length ; i++) {
        randomNumberArray[i] = Math.floor(Math.random() * randomDogData.message.length);
        randomDogUrlArray[i] = randomDogData.message[randomNumberArray[i]];
    }

    // Debugging
    for (let i = 0 ; i < randomDogUrlArray.length ; i++) {
        console.log(randomDogUrlArray[i]);
    }
    for (let i = 0 ; i < randomDogUrlArray.length ; i++) {
        console.log(randomNumberArray[i]);
    }


   res.render('home.ejs', { randomDogUrlArray });
});

app.get("/dbTest", async(req, res) => {
   try {
        const [rows] = await pool.query("SELECT CURDATE()");
        res.send(rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});

//dbTest
app.listen(3000, ()=>{
    console.log("Express server running")
});