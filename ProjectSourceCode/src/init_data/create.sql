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
    current_rank INTEGER,
    total_rankings INTEGER DEFAULT 0,
);

CREATE TABLE User_to_Rankings (
    user_id INT,
    restaurant_id INT,
    ranking VARCHAR(50),
    PRIMARY KEY (user_id, restaurant_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES Restaurants(restaurant_id) ON DELETE CASCADE
);

CREATE TABLE Restaurant_to_Rankings (
    restaurant_id INT,
    ranking int,
    FOREIGN KEY (restaurant_id) REFERENCES Restaurants(restaurant_id) ON DELETE CASCADE
);


/* for discover, I'm trying to access these variables for restaurants (hoping you can include them in the databse):
- name
- image
- rating 
- website
- button for more details? (maybe all the reviews, rankings, etc.)