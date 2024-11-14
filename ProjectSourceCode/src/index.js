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
    res.render('pages/logout');
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

  });


app.get('/discover', (req, res) => {
    const loggedIn = req.session.user ? true : false;
    res.render('pages/discover', { loggedIn });
});

// app.get('/home', (req, res) => {
//     const loggedIn = req.session.user ? true : false;
//     res.render('pages/home', { loggedIn });
// });


// APIs to interact with backend database
/* 
Purpose: get all restaurants and rankings
*/

app.get('/home', async (req, res) => {
    //should return the ranked list for an individual
    console.log("GET /rankings/home endpoint hit"); // Verify route hit
    try {
        const testQuery = `SELECT 
                            Restaurants.name AS name,
                            Restaurants.image_url AS image_url,
                            Ratings.rating AS rating
                        FROM 
                            Ratings
                        JOIN 
                            Restaurants ON Ratings.restaurant_id = Restaurants.id
                        JOIN 
                            Users ON Ratings.user_id = Users.id;`;
        // Simplified test query
        const restaurants = await db.any(testQuery);
        console.log(restaurants);

        res.render('pages/home', { restaurants, loggedIn: true});

    } catch (error) {
        console.error("Error with test query:", error);
        res.status(500).send("Server error with test query");
    }
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
app.get('/add-restaurant', (req, res) => {
    const { name, city, image_url } = req.query;
    res.render('pages/add-restaurant', { name, city, image_url, loggedIn: true });
});

/*
Purpose: get the top restaruants in boulder
*/
app.get('/rankings/discover/', async (req, res) => {
    try {
        const n = int(req.query.n) || 10;

        await db.query(
            `
            SELECT name, image_url, rating
            FROM Restaurants
            ORDER BY rating DESC LIMIT $1
            `, [n]
        )
        
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


app.post('/ratings/add', async (req, res) => {
    try {
        const { name, image_url, price_rating, food_rating } = req.body;
        const user_id = req.session.user.id; // Ensure user session is set

        // Ensure required fields are present
        if (!user_id || !price_rating || !food_rating || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if the restaurant already exists
        let restaurant = await db.oneOrNone('SELECT * FROM Restaurants WHERE name = $1', [name]);
        if (!restaurant) {
            // If the restaurant does not exist, add it
            restaurant = await db.one(
              `INSERT INTO Restaurants (name, image_url, rating, total_ratings)
               VALUES ($1, $2, 0, 0) RETURNING *`,
              [name, image_url]
            );
        }

        const restaurant_id = restaurant.id;

        // Check if the user has already rated this restaurant
        const existingRating = await db.oneOrNone(
            'SELECT * FROM Ratings WHERE user_id = $1 AND restaurant_id = $2',
            [user_id, restaurant_id]
        );
            // maybe go to home to show that they did? 
        if (existingRating) {
            return res.render('pages/discover' ,{ message: 'User has already rated this restaurant' , loggedIn: true});
        }
        // Calculate the user rating
        const user_rating = calculateUserRating(price_rating, food_rating);

        // Add the new rating
        const newRating = await db.one(
            'INSERT INTO Ratings (user_id, restaurant_id, rating) VALUES ($1, $2, $3) RETURNING *',
            [user_id, restaurant_id, user_rating]
        );

        // Update restaurant's overall rating and total ratings count
        const updatedTotalRatings = restaurant.total_ratings + 1;
        const updatedRating = calculateRestaurantRating(restaurant.rating, restaurant.total_ratings, user_rating);

        await db.query(
            `UPDATE Restaurants 
             SET rating = $1,
                 total_ratings = $2
             WHERE id = $3`,
            [updatedRating, updatedTotalRatings, restaurant_id]
        );

        res.render('pages/discover', {
            message: 'Rating added successfully',
            rating: newRating, 
            loggedIn: true
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
    const adjustedValue = 6 - price_rating;

    // Define weights
    const tasteWeight = 0.7;
    const valueWeight = 0.3;

    // Calculate weighted average
    const overallRating = (food_rating * tasteWeight) + (adjustedValue * valueWeight);

    // Optionally round to 1 decimal place
    return Math.round(overallRating );
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
