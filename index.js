const express = require('express');
const cors = require('cors');
require('dotenv').config(); 
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;



app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.b9skr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Access' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({message: 'Forbidden access'})
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        await client.connect();
        const userCollection = client.db('quality_tyre').collection('users');
        const productCollection = client.db('quality_tyre').collection('products');
        const bookproductCollection = client.db('quality_tyre').collection('bookproducts');
        const reviewCollection = client.db('quality_tyre').collection('reviews');
        const paymentCollection = client.db('quality_tyre').collection('payments');

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }
        }

       app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        //get review
        app.get('/review', async (req, res) => {
            const reviews = await reviewCollection.find().toArray();
            res.send(reviews);
        })

        //get booked product
        app.get('/bookproduct/:email', async (req, res) => {
            const bookproducts = await bookproductCollection.find().toArray();
            res.send(bookproducts);
        });

        
        // post reviews
        app.post('/review', async (req, res) => {
            const newService = req.body;
            const result = await reviewCollection.insertOne(newService);
            console.log('Adding product', newService);
            res.send(result);
        });


        // Add Products
        app.post('/addproduct', async (req, res) => {
            const newService = req.body;
            const result = await productCollection.insertOne(newService);
            console.log('Adding product', newService);
            res.send(result);
        });

        //update Profile
        app.put('/profile/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })

        app.put('/profile/:email', async (req, res) => {
            const email = req.params.email;
            console.log(id);
            const updateProduct = req.body;
            const filter = { email: email }
            const option = { upset: true };
            const updateDoc = {
                $set: {
                    
                }
            };
            const result = await productCollection.updateOne(filter, updateDoc, option);
            res.send(result);
        })

        //update Products
        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const updateProduct = req.body;
            const filter = { _id: ObjectId(id) }
            const option = { upset: true };
            const updateDoc = {
                $set: {
                    quantity: updateProduct.quantity,
                }
            };
            const result = await productCollection.updateOne(filter, updateDoc, option);
            res.send(result);
        })

        // Delete a Product
        app.delete('/product/:Id', async (req, res) => {
            const id = req.params.Id;
            const query = { _id: ObjectId(id) }
            const result = await productCollection.deleteOne(query);
            res.send(result);
            console.log(result);
        })

        // booked Products
        app.post('/bookproduct', async (req, res) => {
            const newService = req.body;
            const result = await bookproductCollection.insertOne(newService);
            console.log('Adding product', newService);
            res.send(result);
        });
        
        // Get Booking Products
        app.get('/bookproduct', verifyJWT, async (req, res) => {
            
            const useremail = req.query.useremail;
            const decodedEmail = req.decoded.email;
            if (useremail === decodedEmail) {
                const query = { useremail: useremail };
                const services = await bookproductCollection.find(query).toArray();
                return res.send(services);
            }
            else {
                return res.status(403).send({ message: 'forbidden access' });
            }
        });

        app.patch('/bookproduct/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const result = await paymentCollection.insertOne(payment);
            const updatedBooking = await bookproductCollection.updateOne(filter, updatedDoc);
            res.send(updatedBooking);
        })


        // Get Booking one Products
        app.get('/bookproduct/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const bookproduct = await bookproductCollection.findOne(query);
            res.send(bookproduct)
        });



        // Get Products
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });


        //check is admin
        app.get('/admin/:email', async(req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({admin: isAdmin})
        })

        // user admin database
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        // user insert in database
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.totalPrice;
            const amount = price;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });
        

    }

    finally { 

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello from Doctor Uncle')
})

app.listen(port, () => {
    console.log(`Doctors app listening on port ${port}`)
})

