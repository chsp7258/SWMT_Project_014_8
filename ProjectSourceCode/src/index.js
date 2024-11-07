// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// for adding css and js dir
app.use(express.static(path.join(__dirname, 'resources')));


// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
    extname: 'hbs',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
    host: 'db', // the database server
    port: 5432, // the database port
    database: process.env.POSTGRES_DB, // the database name
    user: process.env.POSTGRES_USER, // the user account to connect with
    password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
    .then(obj => {
        console.log('Database connection successful'); // you can view this message in the docker compose logs
        obj.done(); // success, release the connection;
    })
    .catch(error => {
        console.log('ERROR:', error.message || error);
    });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        saveUninitialized: false,
        resave: false,
    })
);

app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************


app.get('/welcome', (req, res) => {
    res.json({status: 'success', message: 'Welcome!'});
  });

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('pages/login');
});

app.get('/register', (req, res) => {
    res.render('pages/register');
})


// app.post('/register', async (req, res) => {
//     const hash = await bcrypt.hash(req.body.password, 10);
//     const username = req.body.username;

//     const query = 'insert into users (username, password) values($1, $2);';

//     db.none(query, [username, hash])
//         .then(data => {
//             res.redirect('/login');
//         })

//         .catch(err => {
//             console.log(err);
//             res.redirect('/register');
//         });
// });

// for testing 
app.post('/register', async (req, res) => {

    const {username, password} = req.body

    if (username.includes('!')) {
        return res.status(400).json({ message: 'Invalid input'});
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        const query = 'insert into users (username, password) values($1, $2);';

        await db.none(query, [username, hash]);
        res.status(200).redirect('/login');
    } catch (err) {
        console.error('Error during registration:', err);
        res.redirect('/register');
    }
});



app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const query = `select id ,username, password from users where username = $1;`;

    try {
        const user = await db.oneOrNone(query, [username]);

        if (!user) {
            return res.redirect('/register');
        }

        const match = await bcrypt.compare(req.body.password, user.password);

        if (!match) {
            return res.render('pages/login', { message: "Incorrect username or password please try again" });
        }

        req.session.user = user;
        req.session.save();

        // console.log(req.session.user);
        res.redirect('/discover');


    } catch (error) {
        console.log(err);
    };
});


// Authentication Middleware.
const auth = (req, res, next) => {
    if (!req.session.user) {
        // Default to login page.
        return res.redirect('/login');
    }
    next();
};

// Authentication Required
app.use(auth);



app.get('/discover', (req, res) => {
    //this should render the discover page and query the ranked list of restaurants, returning them in a variable called "restaurants", per html
    res.render('pages/discover');
});



// APIs to interact with backend database
/* 
Purpose: get all restaurants and rankings
*/
app.get('/rankings/discover', async (req, res) => {
    //can you store this a value called restaurants?
    //rn I'm trying to use name, image, address, website, rating

});

app.get('/getRestaurant', (req, res) => {
    //should return the info for a particular resturant based on queried name and render this on the page

});

/*
Purpose: add a ranking for a resturant
Request body: 
{
    userId: number, 
    restaurantId: number,
    ranking: number
}
*/
app.post('/rankings/add', async (req, res) => {

});


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');