/* eslint consistent-return:0 */

const express = require('express');
const bodyParser = require('body-parser');

const dev = process.env.NODE_ENV !== 'production';
const app = express();

const userController = require('./controllers/user');

// If you need a backend, e.g. an API, add your custom backend-specific middleware here
app.use(bodyParser.json());
// JWT Authorization
app.use('/webhook/login', userController.postLogin);
app.use('/webhook/signup', userController.postSignup);
app.get('/webhook/webhook', userController.getWebhook);
app.get('/webhook/jwks', userController.getJwks);
// get the intended host and port number, use localhost and port 3000 if not provided
const customHost = process.env.HOST;
const host = customHost || null; // Let http.Server use its default IPv6/4 host
const port = parseInt(process.env.PORT || '3000', 10);
const prettyHost = customHost || 'localhost';

app.listen(port, host, async (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log(`> Ready on http://localhost:${port}`);
});
