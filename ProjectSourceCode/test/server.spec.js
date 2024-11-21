// ********************** Initialize server **********************************

const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const { assert, expect } = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
    // Sample test case given to test / endpoint.
    it('Returns the default welcome message', done => {
        chai
            .request(server)
            .get('/welcome')
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.status).to.equals('success');
                assert.strictEqual(res.body.message, 'Welcome!');
                done();
            });
    });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

// ********************************************************************************

describe('Testing register API', () => {
    it('positive : /register', done => {
        chai
            .request(server)
            .post('/register')
            .send({ username: 'user', password: 'password' })
            .end((err, res) => {
                expect(res).to.have.status(200);
                done();
            });
    });

    it('negative : /register. Invalid username format', done => {
        chai
            .request(server)
            .post('/register')
            .send({ username: '!', password: '1' })
            .end((err, res) => {
                expect(res).to.have.status(400);
                done();
            });
    });

});



describe('Testing Render', () => {
    // Sample test case given to test /test endpoint.
    it('test "/login" route should render with an html response', done => {
      chai
        .request(server)
        .get('/login') // for reference, see lab 8's login route (/login) which renders home.hbs
        .end((err, res) => {
          res.should.have.status(200); // Expecting a success status code
          res.should.be.html; // Expecting a HTML response
          done();
        });
    });
  });


describe('Testing Redirect', () => {
  // Sample test case given to test /test endpoint.
  it('/ route should redirect to /login with 200 HTTP status code', done => {
    chai
      .request(server)
      .get('/')
      .end((err, res) => {
        res.should.have.status(200); // Expecting a redirect status code
        res.should.redirectTo(/^.*127\.0\.0\.1.*\/login$/); // Expecting a redirect to /login with the mentioned Regex
        done();
      });
  });
});



describe('Testing login API', () => {
    it('positive : /login', done => {
        chai
            .request(server)
            .post('/login')
            .send({ username: 'user', password: 'password' })
            .end((err, res) => {
                expect(res).to.have.status(200);
                done();
            });
    });

    it('negative : /login', done => {
        chai
            .request(server)
            .post('/login')
            .send({ username: 'asdf', password: 'asdf' })
            .end((err, res) => {
                expect(res).to.have.status(400);
                done();
            });
    });

});

describe('Testing /ratings/add', () => {
    it('positive', done => {
        chai
            .request(server)
            .post('/ratings/add')
            .set('Cookie', 'session_id=validSessionId')
            .send({name: 'name', image_url: 'url', price_rating: 5, food_rating: 5})
            .end((err, res) => {
                expect(res).to.have.status(200);
                done();
            })
    })
})
describe('Testing /ratings/:restaurantId', () => {
    it('positive', done => {
        chai
            .request(server)
            .post('/ratings/restaurant')
            .end((err, res) => {
                expect(res).to.have.status(200);
                done();
            })
    })
})

describe('Wishlist API Tests', () => {
    // Mock session data
    const mockSession = {
        user: {
            id: 1,
            username: 'testuser'
        }
    };

    // Test adding to wishlist
    describe('POST /wishlist/add', () => {
        it('should successfully add restaurant to wishlist when user is logged in', (done) => {
            chai
                .request(server)
                .post('/wishlist/add')
                .set('Cookie', 'session_id=mocksession')
                .send({
                    restaurantName: 'Test Restaurant'
                })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    done();
                });
        });
    });

    describe('POST /wishlist/remove', () => {
        it('should successfully remove restaurant from wishlist when user is logged in', (done) => {
            chai
                .request(server)
                .post('/wishlist/remove')
                .set('Cookie', 'connect.sid=mocksession')
                .send({
                    restaurant: 'Test Restaurant'
                })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    done();
                });
        });
    });
})