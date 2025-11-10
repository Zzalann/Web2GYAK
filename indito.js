const express = require("express");
const engine = require("ejs-mate");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");
const path = require("path");

const app = express();
const PORT = 4021;

app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

const db = mysql.createConnection({
  host: "localhost",
  user: "studb021",
  password: "abc123",
  database: "db021",
});

db.connect((err) => {
  if (err) {
    console.error("Hiba az adatbázis kapcsolódáskor:", err);
  } else {
    console.log("Database connected!");
  }
});

app.use(
  "/app021/assets",
  express.static(path.join(__dirname, "public/assets"))
);
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "titkoskulcs",
    resave: false,
    saveUninitialized: false,
  })
);

function checkAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/app021/login");
  next();
}

app.get("/app021", (req, res) => {
  res.render("index", {
    title: "Kezdőlap",
    user: req.session.user || null,
  });
});

app.get("/app021/login", (req, res) => {
  res.render("login", {
    title: "Bejelentkezés",
    user: req.session.user,
    error: null,
  });
});

app.post("/app021/login", (req, res) => {
  const { username, password } = req.body;
  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.render("login", {
          error: "Hiba történt, próbáld újra.",
          user: null,
        });
      }
      if (results.length === 0)
        return res.render("login", {
          error: "Nincs ilyen felhasználó!",
          user: null,
        });

      const user = results[0];
      if (!bcrypt.compareSync(password, user.password)) {
        return res.render("login", { error: "Hibás jelszó!", user: null });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
      };
      res.redirect("/app021");
    }
  );
});

app.get("/app021/register", (req, res) => {
  res.render("register", {
    title: "Regisztráció",
    user: req.session.user,
    error: null,
  });
});

app.post("/app021/register", (req, res) => {
  const { username, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  db.query(
    "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
    [username, hashed, "registered"],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.render("register", {
            error: "A felhasználónév már foglalt.",
            user: null,
          });
        }
        console.error(err);
        return res.render("register", {
          error: "Hiba történt, próbáld újra.",
          user: null,
        });
      }
      res.redirect("/app021/login");
    }
  );
});

app.get("/app021/adatbazis", (req, res) => {
  db.query("SELECT * FROM pilota", (err, results) => {
    if (err) {
      console.error(err);
      return res.send("Hiba az adatbázis-lekérdezés során!");
    }
    res.render("adatbazis", {
      title: "Forma–1 pilóták",
      user: req.session.user,
      rows: results,
    });
  });
});

app.get("/app021/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/app021"));
});

app.get("/app021/admin", checkAuth, (req, res) => {
  if (req.session.user.role !== "admin") {
    return res.send("Nincs jogosultságod az admin oldalhoz!");
  }
  res.render("admin", {
    title: "Admin felület",
    user: req.session.user,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
