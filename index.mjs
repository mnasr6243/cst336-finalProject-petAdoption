import express from 'express';
import mysql from 'mysql2/promise'

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));

const pool = mysql.createPool({
    host: "dyud5fa2qycz1o3v.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "tzn68o0wbq4ozrye",
    password: "t5ftnpkmmygiq3i2",
    database: "xevoz15vpgd3tss2",
    connectionLimit: 10,
    waitForConnections: true
});

app.get('/', (req, res) => {
   res.render('home.ejs');
});

app.get('/addAnimal', (req, res) => {
    res.render('addAnimal.ejs')
});

app.post('/addAnimal', async(req, res) => {
    let name = req.body.name;
    let type = req.body.type;
    let breed = req.body.breed;
    let dob = req.body.dob;
    let sex = req.body.sex;

    let sql = `INSERT INTO animal
               (name, type, breed, dob, sex)
               VALUES (?, ?, ?, ?, ?)`;
    let sqlParams = [name, type, breed, dob, sex];
    const [rows] = await pool.query(sql, sqlParams);
    res.render('addAnimal.ejs')
});

app.listen(3000, () => {
   console.log('server started');
});