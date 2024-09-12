require("dotenv").config();
const path = require('path');
const axios = require('axios');
const querystring = require('querystring');
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 8000;
const app = express();
const route = require("./route");
const db = require("./model/index");
const clientId = process.env.clientId;
const redirectUri = process.env.redirectUri;
const scope = process.env.scope;
const tokenUrl = process.env.tokenUrl;
const authUrl = process.env.authUrl
const clientSecret = process.env.clientSecret;
const createContact = require('./controller/createContacts');

let accessToken;

app.use(cors());
app.use(express.json());
const bodyParser = require('body-parser');
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
    extended: true
}));


app.use((req, res, next) => {
    const authHeader = req.headers['authorization']; // Get the Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]; // Extract the token after 'Bearer'
        req.token = token; // Attach the token to the request object
    } else {
        req.token = null; // No token found
    }
    next(); // Move to the next middleware/route handler
});

// Google api start here-----
// Import the path module
app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname, 'page.html')); // Use an absolute path
});
app.use("/api", route)
app.get('/login', (req, res) => {
    const params = {
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scope,
        access_type: 'offline',
        prompt: 'consent',
    };

    const authorizationUrl = `${authUrl}?${querystring.stringify(params)}`;
    res.redirect(authorizationUrl);
});

// Step 2: Capture the authorization code from the redirect URI
app.get('/google/callback', async (req, res) => {
    const { code } = req.query;

    if (code) {
        // Exchange the authorization code for an access token
        try {
            const tokenResponse = await axios.post(tokenUrl, {
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            const { access_token, refresh_token } = tokenResponse.data;
            //localStorage.setItem("token", access_token);
            // const urlCreate = 'https://people.googleapis.com/v1/people:createContact';
            // const response = await axios.get('https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers', {
            //     headers: {
            //       Authorization: `Bearer ${access_token}`, // Include the access token in the Authorization header
            //     },
            //   });
            //   const contactInfo = extractContactInfo(response.data);

            //   const isInserted= axios.post('http://localhost:8080/api/creates',contactInfo)

            //   if (!isInserted){
            //     res.status(202).json({status:false, message: 'Data not inserted'});
            //   }
            // Redirect to a client-side page without tokens in the URL

            res.redirect(`http://localhost:8080?access_token=${access_token}`);

        } catch (error) {
            console.log(error);
            res.status(500).json({ status: false, message: 'Invalide cridentials1', error });
        }
    } else {
        res.status(500).json({ status: false, message: 'Invalide cridentials2' });
    }
});
const extractContactInfo = (data) => {
    const contacts = data.connections.map(connection => {
        const name = connection.names[0]; // Assuming the first name object is the primary one
        const email = connection.emailAddresses ? connection.emailAddresses[0].value : 'N/A';
        const phone = connection.phoneNumbers ? connection.phoneNumbers[0].value : 'N/A';

        return {
            last_name: name.familyName || 'N/A',
            first_name: name.givenName || 'N/A',
            contacts: phone,
            email: email,
            status: 0
        };
    });

    return contacts;
};


module.exports = accessToken;

app.listen(port, () => {
    console.log(`Server started at port ${port}`);
});
