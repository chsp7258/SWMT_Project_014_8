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
    res.json({ status: 'success', message: 'Welcome!' });
});

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('pages/login');
});

app.get('/register', (req, res) => {
    const loggedIn = req.session.user ? true : false;
    res.render('pages/register', { loggedIn });
})


app.post('/register', async (req, res) => {
    const hash = await bcrypt.hash(req.body.password, 10);
    const username = req.body.username;

    if (username.includes('!')) {
        return res.status(400).render('pages/register', {message: 'Username cannot contain special characters like "!"'});
    }

    const query = 'insert into users (username, password) values($1, $2);';

    db.none(query, [username, hash])
        .then(data => {
            res.redirect('/login');
        })

        .catch(err => {
            console.log(err);
            res.redirect('/register');
        });
});


app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const query = `select id ,username, password from users where username = $1;`;

    try {
        const user = await db.oneOrNone(query, [username]);

        if (!user) {
            return res.status(400).render('pages/login', { message: "Username not found. Please try again or register." });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.render('pages/login', { message: "Incorrect username or password please try again" });
        }

        req.session.user = user;
        req.session.save();

        // console.log(req.session.user);
        res.redirect('/discover');

    } catch (error) {
        console.log(error);
        res.status(400);
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


app.get('/logout', (req, res) => {
    res.render('pages/logout', { message: "Logged out successfully!" });
    req.session.destroy();
});

// call to yelp to get info of restaurants
app.get('/search-restaurant', (req, res) => {
    const { name, city } = req.query;

    axios({
        url: `https://api.yelp.com/v3/businesses/search`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${process.env.API_KEY.trim()}`,
            'Accept-Encoding': 'application/json',
        },
        params: {
            term: name,    // Restaurant name
            location: city, // City specified by the user
            limit: 3       // Limit results for simplicity
        },
    })
        .then((response) => {
            const restaurants = response.data.businesses;
            if (restaurants.length === 0) {
                res.render('pages/discover', { message: 'No matching restaurants found. Please enter a valid restaurant name.', loggedIn: true });
            } else {
                res.render('pages/discover', { restaurants,  loggedIn: true });
            }
        })

        .catch(error => {
            console.error('Error fetching data from Yelp API:', error);
            res.render('pages/discover', { message: 'Could not fetch businesses. Please try again later.', loggedIn: true });
        });
    res.render('pages/logout', {message: "Logged out successfully!"});
    req.session.destroy();
  });


  app.get('/discover', (req, res) => {
    const loggedIn = req.session.user ? true : false;
    res.render('pages/discover', { loggedIn });
});

app.get('/home', (req, res) => {
    const loggedIn = req.session.user ? true : false;
    res.render('pages/home', { loggedIn });
});


// APIs to interact with backend database
/* 
Purpose: get all restaurants and rankings
*/
app.get('/rankings/discover', async (req, res) => {
    //I'm trying to access name, image, info
    //can you query these?
    //I'm calling variable restaurants
});

app.get('/rankings/home', async (req, res) => {
    //should return the ranked list for an individual
})


/*
Purpose: add a ranking for a resturant
Request body: 
{
    userId: number, 
    restaurantId: number,
    ranking: number
}
*/
app.post('/ratings/add', async (req, res) => {
    try {
        const { user_id, restaurant_id, price_rating, food_rating } = req.body;

        // Validate inputs
        if (!user_id || !restaurant_id || !price_rating || !food_rating) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (price_rating < 1 || price_rating > 5 || food_rating < 1 || food_rating > 5) {
            return res.status(400).json({ error: 'Ratings must be between 1 and 5' });
        }

        // Check if user has already rated this restaurant
        const existingRating = await pool.query(
            'SELECT * FROM Ratings WHERE user_id = $1 AND restaurant_id = $2',
            [user_id, restaurant_id]
        );

        if (existingRating.rows.length > 0) {
            return res.status(400).json({ error: 'User has already rated this restaurant' });
        }
        // Update restaurant's overall rating and total_ratings
        const currentRestaurant = await client.query(
            'SELECT rating, total_ratings FROM Restaurants WHERE id = $1',
            [restaurant_id]
        );
        const { rating, total_ratings } = currentRestaurant.rows[0];
        const user_rating = calculateUserRating(price_rating, food_rating);
        const restaurant_rating = calculateRestaurantRating(rating, total_ratings, user_rating);

        // Add new rating
        const newRating = await pool.query(
            'INSERT INTO Ratings (user_id, restaurant_id, rating) VALUES ($1, $2, $3) RETURNING *',
            [user_id, restaurant_id, user_rating]
        );

        await pool.query(
            `UPDATE Restaurants 
             SET rating = $1,
                total_ratings = total_ratings + 1
             WHERE id = $2`,
            [restaurant_rating, restaurant_id]
        );

        res.json({
            message: 'Rating added successfully',
            rating: newRating.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

/*
Purpose: getting ratings for a specific restaurant id with params
*/
app.get('/ratings/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;

        // Get restaurant details with its current rating
        const restaurant = await pool.query(
            'SELECT name, rating, total_ratings FROM Restaurants WHERE id = $1',
            [restaurantId]
        );

        if (restaurant.rows.length === 0) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }

        res.json(restaurant.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Helper Functions
const calculateUserRating = (price_rating, food_rating) => {
    return (price_rating + food_rating) / 2;
};

const calculateRestaurantRating = (current_rating, total_ratings, user_rating) => {
    return (current_rating * total_ratings + user_rating) / (total_ratings + 1);
};


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');
