-- Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Create Restaurants Table
CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    current_rank INTEGER,
    total_rankings INTEGER DEFAULT 0,
);

-- Create Rankings Table
CREATE TABLE user_rankings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    restaurant_id INTEGER REFERENCES restaurants(id),
    rank INTEGER NOT NULL
);

/* for discover, I'm trying to access these variables for restaurants (hoping you can include them in the databse):
- name
- image
- rating 
- website
- button for more details? (maybe all the reviews, rankings, etc.)