const dotenv = require("dotenv").config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const port = 5000;
const app = express();
app.disable('x-powered-by');
app.use(express.json());
const pg = require('pg')
const { v4: uuidv4 } = require('uuid');
const cors = require('cors')
const { Pool, Client } = pg

app.use(cors({
    origin: 'http://localhost:3000',
    methods: ["POST", "GET", "PUT", "UPDATE"]
}))

// const pool = new Pool({
//     host:"localhost",
//     user:"postgres",
//     port:"5432",
//     password:"12345",
//     database:"CustomProject01",
// })

// const pool = new Pool({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     port: process.env.DB_PORT,
//     dialect: "postgres",
//     pool: {
//       max: 5,
//       min: 0,
//       acquire: 30000,
//       idle: 10000
//     }
// })
  
// const client = new Client({
//     host:process.env.DB_HOST,
//     user:process.env.DB_USER,
//     post:process.env.DB_PORT,
//     password:process.env.DB_PASSWORD,
//     database:process.env.DB_NAME,
//     // connectionString: process.env.POSTGRES_CONNECTION_STRING
//   })
console.log(process.env.POSTGRES_CONNECTION_STRING)
const client = new Client({
    // host:"localhost",
    // user:"postgres",
    // post:"5432",
    // password:"12345",
    // database:"CustomProject01",
    //connectionString: process.env.POSTGRES_CONNECTION_STRING
    connectionString: 'postgres://postgres:12345@localhost:5432/CustomProject01'
  })

  const pool = new Pool({
    // host:"localhost",
    // user:"postgres",
    // post:"5432",
    // password:"12345",
    // database:"CustomProject01",
    //connectionString: process.env.POSTGRES_CONNECTION_STRING
    connectionString: 'postgres://postgres:12345@localhost:5432/CustomProject01'
  })

  client.connect()
  .then(() => console.log('Connected to PostgresSQL'))
  .catch((err) => console.log(`Connection error ${process.env.POSTGRES_CONNECTION_STRING}`, err.stack))


const initializeDbAndServer = async () => {
    try {
        app.listen(port, () => {
            console.log(`Server Running at http://localhost:${port}`);
        });
    } catch (error) {
        console.log(`${error.message}`);
        process.exit(1);
    }
};

initializeDbAndServer();

const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers['authorization'];
    if(authHeader !== undefined){
        jwtToken = authHeader.split(" ")[1];
    }
    if(jwtToken === undefined){
        response.status(401);
        response.send('Invalid JWT Token');        
    }else{
        jwt.verify(jwtToken, `${jwtToken}`,async (error, payLoad) => {
            if(error){
                response.status(401);
                response.send('Invalid JWT Token');
            }else{
                request.headers.username = payLoad.username;
                next();
            }
        });
    }
};


app.get('/', async (request,response)=>{
    response.send({msg: 'Valid'})
})

app.get('/user/:username', async (request, response)=> {
    const username    =   request.body.username
    const  client = await pool.connect();

    const query = "select *  FROM public.usermetadata nolock where username = $1;";
    const preparedQuery = {
        text: query,
        values: [username]
    };

//     client.query(`select *  FROM public.usermetadata nolock where username = '${username}';`,async (err, res)=> {

//         if(res.rows[0] !== undefined){
//             response.send({msg:'Invalid user'});
//         }else{
//             response.send({msg : 'New User'})
            
//         } 
//       client.end()

// })
        try{
        client.query(preparedQuery,async (err, res)=> {

            if(res.rows[0] !== undefined){
                response.send({msg:'Invalid user'});
            }else{
                response.send({msg : 'New User'})
                
            } 
})
        } finally {
            client.release(); // Ensures connection is closed properly
        }

})

const rateLimit = require("express-rate-limit");

// Limit login attempts per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Allow only 5 login attempts per 15 minutes per IP
    message: { err_msg: "Too many login attempts. Please try again later." },
    headers: true,
});

// Apply rate limiting to login route
app.post('/login', loginLimiter, async (request, response) => {
    const { username, password } = request.body;
    const payLoad = { username };

    try {
        const client = await pool.connect();
        const query = "SELECT * FROM public.usermetadata WHERE username = $1;";
        const preparedQuery = { text: query, values: [username] };

        const res = await client.query(preparedQuery);
        client.release();

        if (!res.rows.length) {
            return response.status(400).send({ err_msg: 'Invalid User or Password' });
        }

        const isPasswordMatches = await bcrypt.compare(password, res.rows[0].password);
        if (isPasswordMatches) {
            const jwt_token = jwt.sign(payLoad, process.env.JWT_SECRET);
            response.send({ jwt_token });
        } else {
            response.status(400).send({ err_msg: 'Invalid User or Password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        response.status(500).send({ err_msg: 'Internal Server Error' });
    }
});


// //API: Login User
// app.post('/login', async (request, response) => {
//     const {username, password} = request.body;
//     const payLoad = {username};
//     const jwt_token = jwt.sign(payLoad, `${jwtToken}`);

//     const client = await pool.connect();

//     const query = "select *  FROM public.usermetadata nolock where username = $1;";
//     const preparedQuery = {
//         text: query,
//         values: [username]
//     };
//     try{
//     client.query(preparedQuery,async (err, res)=> {
//         if(res.rows[0] === undefined){
//             response.status(400)
//             response.send({err_msg : 'Invalid User or Password'});
//         }else{
           
//             const isPasswordMatches = await bcrypt.compare(password, res.rows[0].password)
//                 if(isPasswordMatches){
//                     response.send({jwt_token});
//                 }else{
                    
//                     response.status(400);
//                     response.send({err_msg : 'Invalid User or Password'});            
                
//             };
            
//         } 
//          })
//         } finally {
//             client.release(); // Ensures connection is closed properly
//         }
  

    
// });

app.post('/signup', async (req, res) => {
    const {username, lastname, firstname, password} = req.body 
    
    const hash = await bcrypt.hash(password, 13);
    
    const client = await pool.connect()

    const query = `INSERT INTO public.usermetadata("SNo", username, lastname, firstname, password) VALUES ($1 ,$2 ,$3 ,$4 ,$5);`
    const preparedQuery = {
        text: query,
        values: [uuidv4(),username,lastname,firstname,hash]
    };

    try{

    client.query(preparedQuery, async(err, reqquery) => {
          if(reqquery !== undefined){
            console.log("Query Executed Successfully")
            res.send({status:'OK'})
          }
          else{
            console.log(err)
            res.send({err_msg : 'Error Occured'})
          }

    })
} finally {
    client.release(); // Ensures connection is closed properly
}

})



module.exports = app;