# CSCI 3308 Team 014-8

# Application Description
CheapEats allows users to discover and rank restaurants based on quality and affordability. When logged in, users can see a list of the restaurants that they have visited and ranked, along with the ratings they have provided. Users can also navigate to the explore page to see a list of recommended restaurants with the highest ratings given by other users. Finally, the add restuarant page allows users to search for and add restaurants to their personal list. The application keeps track of all users, personal ratings, restaurants, and restaurant ratings in order to dynamically recommend restaurants to users. CheapEats is a practical application designed to cater to those who are budget-concious but enjoy dining!

## Contributors
Abdullahi Husein  <br>
Alec Wang  <br>
Christopher Sponza  <br>
Mara Backsen  <br>
Nathnael Tewelde  <br>

## Technology Stack 
Backend: <br>
SQL Database <br>
API Route Call to Yelp using Axios (to populate database) <br>
API Routes in Node.Js (to query database) <br>
Helper functions in JavaScript <br>
<br>
Frontend: <br>
Page design and partials in Handlebars (HTML framework) <br>
Page styling in CSS <br>

Database: Our application is built on an SQL database with three tables to store user information, restaurant information, and rating information. <br>
<br>
Axios: The restaurant table is populated using an API route (in Axios) to Yelp to obtain a list of restaurants with name and image information. <br>
<br>
Node.Js: Our front-end connects with our database using API route calls written in Node.Js. The front-end incorporates calls to these API routes, which query the database and return information to the front-end.<br>
<br>
JavaScript: Our application uses several helper functions written in JavaScript to calculate ratings for each restaurant. These are accessed by API routes to populate and update the rating information in the database. <br>
<br>
Handlebars: The front-end is written in Handlebars - a framework built on HTML - and uses templating to divide amongst pages and partials (both of which are written in Handlebars). Pages include calls to partials. <br>
<br>
CSS: The styling for the front-end is written in an external CSS style sheet, which is accessed by the Handlebars code to execute styling for pages and partials.

## Prerequisites to Run 
You will need npm, docker, and git installed

## How to Run
Clone the repository

Install Dependencies with ```npm i```

Create a .env file with the following variables:
```
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="pwd"
POSTGRES_DB="users_db"
SESSION_SECRET="session_secret"
API_KEY=<yelp-api-key>
```

Run ```docker compose up``` to run the server

Access the website on ```localhost:3000```

## Test Instructions 
Tests will run when you run ```docker compose up```

## Application Link
