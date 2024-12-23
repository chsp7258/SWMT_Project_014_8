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
    image_url VARCHAR(255), -- New column to store the image URL
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

CREATE TABLE Wishlist (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL, 
    restaurant VARCHAR(45) NOT NULL 
);

-- -- Create Friendships Table
-- CREATE TABLE Friendships (
--     id SERIAL PRIMARY KEY,
--     user_id INT NOT NULL,
--     friend_id INT NOT NULL,
--     status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (user_id) REFERENCES Users(id),
--     FOREIGN KEY (friend_id) REFERENCES Users(id),
--     CONSTRAINT unique_friendship UNIQUE (user_id, friend_id) -- Prevent duplicate friendships
-- );