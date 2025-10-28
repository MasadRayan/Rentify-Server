const express = require('express')
const app = express()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const admin = require("firebase-admin");

const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json());


const serviceAccount = require("./firebase-admin_Key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.df8vtvh.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,

  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("rentifyDB");

    const carsCollection = db.collection("cars");
    const usersCollection = db.collection("users");

    // Custom middleware_______________________________
    // firebase token
    const verifyFBToken = async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'Unauthorized access' });
      }
      const idToken = authHeader.split(' ')[1];
      if (!idToken) {
        return res.status(401).send({ message: 'Unauthorized access' });
      }

      // Verify the ID token using Firebase Admin SDK
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.decoded = decodedToken;
        next();
      } catch (error) {
        return res.status(403).send({ message: 'Forbidden access' });
      }

    }

    // Car APIs_______________________________________

    // GET all cars OR cars by user email
    app.get('/myCars', verifyFBToken, async (req, res) => {
      const email = req.query.email;

      // console.log("Header in cars", req.headers)

      if (email) {
        // Get cars by specific user email
        const query = { userEmail: email };
        const result = await carsCollection.find(query).sort({ _id: -1 }).toArray();
        res.send(result);
      } else {
        // Get all cars
        const result = await carsCollection.find().sort({ _id: -1 }).toArray();
        res.send(result);
      }
    });

    app.post('/cars', async (req, res) => {
      const car = req.body;
      const result = await carsCollection.insertOne(car);
      res.send(result);
    })

    // DELETE car by ID
    app.delete('/cars/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carsCollection.deleteOne(query);
      res.send(result);
    });

    // User APIs_______________________________________
    app.post('/users', async (req, res) => {
      const email = req.body.email;

      const userExist = await usersCollection.findOne({ email })
      if (userExist) {
        return res.status(409).send({ message: "User already exists" });
      }
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.get('/users', verifyFBToken, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!!!!!!!!!!!!!!!!!!!!!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})