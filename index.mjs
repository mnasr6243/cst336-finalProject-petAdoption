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

app.get('/getBySpecies', async (req, res) => {
    let species = req.query.species;
    let sql = `SELECT *
               FROM animals
               WHERE species = ?`;
    let sqlParams = [`${species}`];
    const [rows] = await pool.query(sql, sqlParams);
    // TODO: depends on the structure of viewing pages
    //       by species
    res.render('species.ejs', { rows });
});

app.get('/addAnimal', (req, res) => {
    res.render('addAnimal.ejs')
});

app.post('/addAnimal', async(req, res) => {
    let name = req.body.name;
    let species = req.body.species;
    let breed = req.body.breed;
    let dob = req.body.dob;
    let sex = req.body.sex;
    let description = req.body.description;
    let status = "available"

    let sql = `INSERT INTO animals
               (name, species, breed, dob, sex, description, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
    let sqlParams = [name, species, breed, dob, sex, description, status];
    const [rows] = await pool.query(sql, sqlParams);
    res.render('addAnimal.ejs')
});

app.listen(3000, () => {
   console.log('server started');
});