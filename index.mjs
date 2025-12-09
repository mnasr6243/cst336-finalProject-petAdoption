import express from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// DB pool using env variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || "dyud5fa2qycz1o3v.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
  user: process.env.DB_USER || "tzn68o0wbq4ozrye",
  password: process.env.DB_PASSWORD || "t5ftnpkmmygiq3i2",
  database: process.env.DB_NAME || "xevoz15vpgd3tss2",
  connectionLimit: 10,
  waitForConnections: true
});

// routes
app.get('/', (req, res) => {
  res.render('home.ejs');
});

app.get('/dog', async (req, res) => {
  try {
    const randomDog = await fetch("https://dog.ceo/api/breeds/image/random/10");
    const randomDogData = await randomDog.json();
    const images = randomDogData.message;

    res.render('dog.ejs', { images });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading dog images");
  }
});

app.get('/cat', async (req, res) => {
  try {
    const response = await fetch("https://api.thecatapi.com/v1/images/search?limit=10");
    const data = await response.json();

    const images = data.map(item => item.url);
    res.render('cat.ejs', { images });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading cat images");
  }
});

app.get("/dbTest", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT CURDATE()");
    res.send(rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Database error!");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});