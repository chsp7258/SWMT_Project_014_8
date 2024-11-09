-- Create Users Table
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Create Restaurants Table
CREATE TABLE Restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rating INTEGER,
    total_ratings INTEGER DEFAULT 0
);

-- Create Ratings Table
CREATE TABLE Ratings (
    id SERIAL PRIMARY KEY,
    user_id INT,
    restaurant_id INT,
    rating INTEGER,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (restaurant_id) REFERENCES Restaurants(id)
);
