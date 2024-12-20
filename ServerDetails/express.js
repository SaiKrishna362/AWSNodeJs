const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const port = 5000;
const app = express();
app.use(express.json());
const pg = require('pg')
const { v4: uuidv4 } = require('uuid');
const cors = require('cors')
const { Pool, Client } = pg

app.use(cors({
    origin: 'http://localhost:3000',
    methods: ["POST", "GET", "PUT", "UPDATE"]
}))

const pool = new Pool({
    host:"localhost",
    user:"postgres",
    post:"5432",
    password:"12345",
    database:"CustomProject01",
})
  
// const client = new Client({
//     host:"localhost",
//     user:"postgres",
//     post:"5432",
//     password:"12345",
//     database:"CustomProject01",
//   })

//   client.connect()


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
        jwt.verify(jwtToken, "SECRET_KEY",async (error, payLoad) => {
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

app.get('/user/:username', async (request, response)=> {
    const {username}    =   request.params
    const  client = await pool.connect();

    client.query(`select *  FROM public.usermetadata nolock where username = '${username}';`,async (err, res)=> {

        if(res.rows[0] !== undefined){
            response.send({msg:'Invalid user'});
        }else{
            response.send({msg : 'New User'})
            
        } 
      client.end()

})


})

//API: Login User
app.post('/login', async (request, response) => {
    const {username, password} = request.body;
    const payLoad = {username};
    const jwt_token = jwt.sign(payLoad, "SECRET_KEY");

    const client = await pool.connect();
 
    client.query(`select *  FROM public.usermetadata nolock where username = '${username}';`,async (err, res)=> {
        if(res.rows[0] === undefined){
            response.status(400)
            response.send({err_msg : 'Invalid User or Password'});
        }else{
           
            const isPasswordMatches = await bcrypt.compare(password, res.rows[0].password)
                if(isPasswordMatches){
                    response.send({jwt_token});
                }else{
                    
                    response.status(400);
                    response.send(err);            
                
            };
            
        } 
      client.end()
    })
  

    
});

app.post('/signup', async (req, res) => {
    const {username, lastname, firstname, password} = req.body 
    
    const hash = await bcrypt.hash(password, 13);
    
    const client = await pool.connect()


    client.query(`INSERT INTO public.usermetadata("SNo", username, lastname, firstname, password)
	VALUES ('${uuidv4()}' ,'${username}' ,'${lastname}' ,'${firstname}' ,'${hash}' );`, async(err, reqquery) => {
          if(reqquery !== undefined){
            console.log("Query Executed Successfully")
            res.send({status:'OK'})
          }
          else{
            console.log(err)
            res.send(err)
          }

    })

})



module.exports = app;