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
    const username = req.body.username;
    const password = req.body.password;

    // Check if username contains special characters
    if (username.includes('!')) {
        return res.status(400).render('pages/register', { message: 'Username cannot contain special characters like "!"' });
    }

    try {
        // Check if the username already exists
        const userExists = await db.oneOrNone('SELECT id FROM users WHERE username = $1;', [username]);

        if (userExists) {
            return res.status(400).render('pages/register', { message: 'Username is already taken. Please choose another one.' });
        }

        // Hash the password
        const hash = await bcrypt.hash(password, 10);

        // Insert new user
        const query = 'INSERT INTO users (username, password) VALUES ($1, $2);';
        await db.none(query, [username, hash]);

        // Redirect to login page after successful registration
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.status(500).render('pages/register', { message: 'An error occurred. Please try again.' });
    }
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
        res.redirect('/explore');

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
// Discover was renamed to Add Rating
app.get('/discover', (req, res) => {
    const loggedIn = req.session.user ? true : false;
    res.render('pages/discover', { loggedIn });
});

// Search for users by username
app.get('/search-users', async (req, res) => {
    const { username } = req.query; // Get the username from query parameters

    try {
        // Query to search for users with similar usernames
        const users = await db.any(
            `
            SELECT id, username 
            FROM users 
            WHERE username ILIKE $1
            LIMIT 10;
            `, [`%${username}%`]
        );

        if (users.length === 0) {
            return res.render('pages/search-users', { 
                message: 'No users found matching your search.', 
                loggedIn: true 
            });
        }

        // Render the search results
        res.render('pages/search-users', { 
            users, 
            loggedIn: true 
        });

    } catch (error) {
        console.error('Error searching for users:', error);
        res.status(500).render('pages/search-users', { 
            message: 'An error occurred while searching. Please try again.', 
            loggedIn: true 
        });
    }
});

app.get('/home', async (req, res) => {
    //should return the ranked list for an individual
    console.log("GET /rankings/home endpoint hit"); // Verify route hit
    try {
        const userId = req.session.user.id; // Get logged-in user ID
        
        const restaurantQuery = `SELECT 
                            Restaurants.name AS name,
                            Restaurants.image_url AS image_url,
                            Ratings.rating AS rating
                        FROM 
                            Ratings
                        JOIN 
                            Restaurants ON Ratings.restaurant_id = Restaurants.id
                        WHERE 
                            Ratings.user_id = $1;`;
        // Simplified test query
        const restaurants = await db.any(restaurantQuery, [userId]);

        // Fetch wishlist for the logged-in user
        const wishlistQuery = `
            SELECT Restaurant
            FROM Wishlist
            WHERE user_id = $1;
        `;
        const wishlist = await db.any(wishlistQuery, [userId]);

        res.render('pages/home', {restaurants, wishlist,
                                loggedIn: true, 
                                username: req.session.user ? req.session.user.username : null  // Ensure user is logged in
        });

    } catch (error) {
        console.error("Error with test query:", error);
        res.status(500).send("Server error with test query");
    }
});

app.get('/users/:username', async (req, res) => {
    const username = req.params.username;

    try {
        // Fetch user's ratings and wishlist from the database
        const userRatings = await db.any(
            `SELECT r.name AS restaurant_name, rt.rating, r.image_url
             FROM Ratings rt 
             JOIN Restaurants r ON rt.restaurant_id = r.id 
             WHERE rt.user_id = (SELECT id FROM Users WHERE username = $1)`,
            [username]
        );

        const userWishlist = await db.any(
            `SELECT restaurant 
             FROM Wishlist 
             WHERE user_id = (SELECT id FROM Users WHERE username = $1)`,
            [username]
        );

        // Render the `other-user-home` view with data
        res.render('pages/other-user-home', { username, reviews: userRatings, wishlist: userWishlist, loggedIn: true });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Internal Server Error');
    }
});

/*
In explore page there is a wishlist button
grabs info of restaurant in the card that was selected 
with no additional cost to user this grabs info from card 
and adds it to wishlist table
*/
app.get('/wishlist/explore/add', async (req, res) => {
    try {
        const userId = req.session.user.id; // Corrected to use req.session
        const { name } = req.query; // Extract the restaurant name from query parameters

        const wishlistQuery = `
            INSERT INTO Wishlist (user_id, restaurant)
            VALUES ($1, $2);
        `;

        // Use db.none for an INSERT query
        await db.none(wishlistQuery, [userId, name]);

        // Redirect to the explore page
        res.redirect('/home');
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).send("Server error while adding to wishlist.");
    }
});


/* grabs user and name of restaurant to add 
 adds to wishlist table
 */
app.post('/wishlist/add', async (req, res) => {
    console.log('here')
    try {
    
        const userId = req.session.user.id;
        const {restaurantName} = req.body;

        // Insert into Wishlist table
        const wishlistQuesry = `
            INSERT INTO Wishlist (user_id, restaurant)
            VALUES ($1, $2)
        `;
        await db.none(wishlistQuesry, [userId, restaurantName]);

        res.redirect('/home');
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).send("Server error while adding to wishlist.");
    }
});

app.post('/wishlist/remove', async (req, res) => {
    console.log("POST /wishlist/remove endpoint hit");
    try {
        const userId = req.session.user.id; // Ensure user is logged in
        const { restaurant } = req.body; // Get the restaurant name from the request body

        // Delete the restaurant from the Wishlist table
        const deleteQuery = 
            `DELETE FROM Wishlist
            WHERE user_id = $1 AND restaurant = $2 ;`
        ;
        await db.none(deleteQuery, [userId, restaurant]);
        res.redirect('/home');
    } catch (error) {
        console.error("Error removing from wishlist:", error);
        res.status(500).send("Server error while removing from wishlist.");
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


// app.get('/explore', (req, res) => {
//     res.render('pages/explore');
// });

/*
Grabs inputed information from database
changes displayed info as more info is added to db
*/
app.get('/explore', async (req, res) => {
    try {
        // Fetch top 10 restaurants
        const places = await db.query(
            `
            SELECT *
            FROM Restaurants
            ORDER BY rating DESC
            LIMIT $1;
            `, [20]
        );
        console.log({places});
        // Render the explore page and pass the data
        res.render('pages/explore', { places , loggedIn: true});
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
    return Math.round(overallRating *2);
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
