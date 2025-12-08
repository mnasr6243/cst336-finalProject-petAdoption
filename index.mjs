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
app.get('/', (req, res) => {
    res.render('home.ejs');
})

app.get('/dog', async (req, res) => {
    let randomDog = await fetch("https://dog.ceo/api/breeds/image/random/10");
    let randomDogData = await randomDog.json();
    let images = randomDogData.message;

    console.log(randomDogData);

   res.render('dog.ejs', { images });
});

app.get('/cat' , async (req, res) => {
    let response = await fetch("https://api.thecatapi.com/v1/images/search?limit=10");
    let data = await response.json();

    let images = data.map(item => item.url);
    console.log(images);

    res.render('cat.ejs', { images });
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