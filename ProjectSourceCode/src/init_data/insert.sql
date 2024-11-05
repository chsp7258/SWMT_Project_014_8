INSERT INTO Users (username, email, password)
VALUES 
    ('john_doe', 'john@example.com', 'password_1'),
    ('jane_smith', 'jane@example.com', 'password_2'),
    ('alex_brown', 'alex@example.com', 'password_3');

INSERT INTO Restaurants (name, address, phone, description, category, num_reviews)
VALUES 
    ('Pasta Paradise', '123 Main St', '555-1234', 'Italian bistro with homemade pasta', 'Italian', 20),
    ('Burger Haven', '456 Elm St', '555-5678', 'Best burgers in town', 'American', 35),
    ('Sushi World', '789 Maple Ave', '555-8765', 'Fresh sushi daily', 'Japanese', 15);

INSERT INTO User_to_Rankings (user_id, restaurant_id, ranking)
VALUES 
    (1, 1, 'Favorite'),
    (2, 2, 'Highly Recommended'),
    (3, 3, 'Good'),
    (1, 2, 'Good');
