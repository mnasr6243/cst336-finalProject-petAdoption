// index.mjs
import express from "express";
import mysql from "mysql2/promise";
import session from "express-session";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// ---------------------- MySQL connection pool ----------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

const conn = pool;

// ---------------------- Sessions ----------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET || "super-secret-pet-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Make auth info available in all views
app.use((req, res, next) => {
  res.locals.loggedIn = !!req.session.userId;
  res.locals.username = req.session.username || null;
  res.locals.isAdmin = !!req.session.isAdmin;
  next();
});

// Simple login protection
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

// Admin-only protection
function requireAdmin(req, res, next) {
  if (!req.session.userId || !req.session.isAdmin) {
    return res.redirect("/login");
  }
  next();
}

// ---------------------- AUTH ROUTES ----------------------

// Login page
app.get("/login", (req, res) => {
  if (req.session.userId) return res.redirect("/");
  res.render("login.ejs", { error: null });
});

// Handle login (bcrypt)
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await conn.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (!rows.length) {
      return res.render("login.ejs", { error: "Invalid username or password" });
    }

    const user = rows[0];
    const matches = await bcrypt.compare(password, user.password);

    if (!matches) {
      return res.render("login.ejs", { error: "Invalid username or password" });
    }

    // Success: store in session
    req.session.userId = user.userId;
    req.session.username = user.username;
    req.session.isAdmin = !!user.isAdmin;

    res.redirect("/");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Login error");
  }
});

// Signup page (for new users)
app.get("/signup", (req, res) => {
  if (req.session.userId) return res.redirect("/");
  res.render("signup.ejs", { error: null });
});

// Handle signup (with firstName/lastName)
app.post("/signup", async (req, res) => {
  const { username, password, firstName, lastName } = req.body;

  if (!username || !password || !firstName || !lastName) {
    return res.render("signup.ejs", {
      error: "Please fill in all fields",
    });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    await conn.query(
      "INSERT INTO users (username, firstName, lastName, password, isAdmin) VALUES (?, ?, ?, ?, 0)",
      [username, firstName, lastName, hashed]
    );

    // After signup, send them to login
    res.redirect("/login");
  } catch (err) {
    console.error("Signup error:", err);
    // duplicate username
    res.render("signup.ejs", {
      error: "Username already exists or invalid input",
    });
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ---------------------- HOME PAGE (protected) ----------------------
app.get("/", requireLogin, (req, res) => {
  res.render("home.ejs");
});

// ---------------------- EXTERNAL API PAGES (protected) ----------------------

app.get("/dog", requireLogin, async (req, res) => {
  try {
    const response = await fetch("https://dog.ceo/api/breeds/image/random/10");
    const data = await response.json();
    res.render("dog.ejs", { images: data.message });
  } catch (err) {
    console.error("Dog API error:", err);
    res.status(500).send("Error loading dog images");
  }
});

app.get("/cat", requireLogin, async (req, res) => {
  try {
    const response = await fetch(
      "https://api.thecatapi.com/v1/images/search?limit=10"
    );
    const data = await response.json();
    res.render("cat.ejs", { images: data.map((img) => img.url) });
  } catch (err) {
    console.error("Cat API error:", err);
    res.status(500).send("Error loading cat images");
  }
});

// ---------------------- LOCAL API (for Fetch, protected) ----------------------

// Simple API returning all available animals
app.get("/api/animals", requireLogin, async (req, res) => {
  try {
    const [animals] = await conn.query(
      "SELECT * FROM animals WHERE status = 'available' ORDER BY animalName"
    );
    res.json(animals);
  } catch (err) {
    console.error("Error fetching animals:", err);
    res.status(500).json({ error: "Error fetching animals" });
  }
});

// ---------------------- ANIMAL CRUD (animals table) ----------------------

// View all available animals (protected)
app.get("/animals", requireLogin, async (req, res) => {
  try {
    const species = req.query.species;
    
    let query = "SELECT * FROM animals WHERE status = 'available'";
    let params = [];
    
    if (species) {
      query += " AND species = ?";
      params.push(species);
    }
    
    query += " ORDER BY animalName";

    const [animals] = await conn.query(query, params);
    res.render("animals.ejs", { animals });
  } catch (err) {
    console.error("Error loading animals:", err);
    res.status(500).send("Error loading animals");
  }
});

// Add animal form (admin only)
app.get("/animals/add", requireAdmin, (req, res) => {
  res.render("addAnimal.ejs", { message: null });
});

// Handle add animal (admin only)
app.post("/animals/add", requireAdmin, async (req, res) => {
  const { animalName, species, age, status } = req.body;

  try {
    await conn.query(
      `INSERT INTO animals (animalName, species, age, status)
       VALUES (?, ?, ?, ?)`,
      [animalName, species, age || null, status || "available"]
    );

    res.render("addAnimal.ejs", { message: "Animal added!" });
  } catch (err) {
    console.error("Error adding animal:", err);
    res.status(500).send("Error adding animal");
  }
});

// Edit animal form (pre-filled, admin only)
app.get("/animals/:id/edit", requireAdmin, async (req, res) => {
  try {
    const [rows] = await conn.query(
      "SELECT * FROM animals WHERE animalId = ?",
      [req.params.id]
    );
    if (!rows.length) {
      return res.redirect("/animals");
    }
    res.render("editAnimal.ejs", { animal: rows[0], message: null });
  } catch (err) {
    console.error("Error loading animal:", err);
    res.status(500).send("Error loading animal");
  }
});

// Update animal (admin only)
app.post("/animals/:id/edit", requireAdmin, async (req, res) => {
  const { animalName, species, age, status } = req.body;

  try {
    await conn.query(
      `UPDATE animals 
       SET animalName = ?, 
           species    = ?, 
           age        = ?, 
           status     = ?
       WHERE animalId = ?`,
      [animalName, species, age || null, status, req.params.id]
    );

    const [rows] = await conn.query(
      "SELECT * FROM animals WHERE animalId = ?",
      [req.params.id]
    );

    res.render("editAnimal.ejs", { animal: rows[0], message: "Animal updated!" });
  } catch (err) {
    console.error("Error updating animal:", err);
    res.status(500).send("Error updating animal");
  }
});

// ---------------------- ADOPTION FLOW (protected) ----------------------

// Confirm adoption page (login required)
app.get("/adopt/:id", requireLogin, async (req, res) => {
  try {
    const [rows] = await conn.query(
      "SELECT * FROM animals WHERE animalId = ?",
      [req.params.id]
    );
    if (!rows.length) {
      return res.redirect("/animals");
    }
    res.render("adopt.ejs", { animal: rows[0] });
  } catch (err) {
    console.error("Error loading adopt page:", err);
    res.status(500).send("Error loading adopt page");
  }
});

// Adopt pet (login required)
app.post("/adopt/:id", requireLogin, async (req, res) => {
  const id = req.params.id;

  try {
    await conn.query(
      `INSERT INTO adoptions (animalId) VALUES (?)`,
      [id]
    );

    await conn.query(
      `UPDATE animals SET status = 'adopted' WHERE animalId = ?`,
      [id]
    );

    res.redirect("/animals");
  } catch (err) {
    console.error("Error adopting pet:", err);
    res.status(500).send("Error adopting pet");
  }
});

// ---------------------- ADMIN: USER MANAGEMENT ----------------------

// List users
app.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const [users] = await conn.query(
      "SELECT userId, username, firstName, lastName, isAdmin FROM users ORDER BY username"
    );
    res.render("adminUsers.ejs", { users });
  } catch (err) {
    console.error("Error loading users:", err);
    res.status(500).send("Error loading users");
  }
});

// Edit user form
app.get("/admin/users/:id/edit", requireAdmin, async (req, res) => {
  try {
    const [rows] = await conn.query(
      "SELECT userId, username, firstName, lastName, isAdmin FROM users WHERE userId = ?",
      [req.params.id]
    );
    if (!rows.length) {
      return res.redirect("/admin/users");
    }
    res.render("editUser.ejs", { user: rows[0], message: null });
  } catch (err) {
    console.error("Error loading user:", err);
    res.status(500).send("Error loading user");
  }
});

// Handle user update
app.post("/admin/users/:id/edit", requireAdmin, async (req, res) => {
  const { username, firstName, lastName, isAdmin } = req.body;
  const userId = req.params.id;

  // Prevent demoting yourself from admin (optional safety)
  if (Number(userId) === Number(req.session.userId) && isAdmin !== "1") {
    return res.render("editUser.ejs", {
      user: { userId, username, firstName, lastName, isAdmin: 1 },
      message: "You cannot remove your own admin status.",
    });
  }

  try {
    await conn.query(
      `UPDATE users
       SET username = ?,
           firstName = ?,
           lastName = ?,
           isAdmin = ?
       WHERE userId = ?`,
      [username, firstName, lastName, isAdmin === "1" ? 1 : 0, userId]
    );

    const [rows] = await conn.query(
      "SELECT userId, username, firstName, lastName, isAdmin FROM users WHERE userId = ?",
      [userId]
    );

    res.render("editUser.ejs", {
      user: rows[0],
      message: "User updated!",
    });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).send("Error updating user");
  }
});

// Delete user
app.post("/admin/users/:id/delete", requireAdmin, async (req, res) => {
  const userId = req.params.id;

  // Prevent deleting yourself
  if (Number(userId) === Number(req.session.userId)) {
    return res.redirect("/admin/users");
  }

  try {
    await conn.query("DELETE FROM users WHERE userId = ?", [userId]);
    res.redirect("/admin/users");
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).send("Error deleting user");
  }
});

// ---------------------- ADMIN VIEWS ----------------------

// Admin animals management
app.get("/admin/animals", requireAdmin, async (req, res) => {
  try {
    const [rows] = await conn.query(
      "SELECT * FROM animals ORDER BY status, animalName"
    );
    res.render("adminAnimals.ejs", { animals: rows });
  } catch (err) {
    console.error("Error loading admin animals:", err);
    res.status(500).send("Error loading admin animals");
  }
});

// Admin adoption log
app.get("/admin/adoptions", requireAdmin, async (req, res) => {
  try {
    const [rows] = await conn.query(
      `SELECT ad.adoptionId, ad.adoptedAt,
              an.animalName, an.species
       FROM adoptions ad
       JOIN animals an ON ad.animalId = an.animalId
       ORDER BY ad.adoptedAt DESC`
    );
    res.render("adminAdoptions.ejs", { adoptions: rows });
  } catch (err) {
    console.error("Error loading adoptions:", err);
    res.status(500).send("Error loading adoptions");
  }
});

// ---------------------- DB TEST ----------------------
app.get("/dbTest", async (req, res) => {
  try {
    const [rows] = await conn.query("SELECT CURDATE() AS today");
    res.send(rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Database error!");
  }
});

// ---------------------- START SERVER ----------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🐾 Server running on port " + PORT);
});