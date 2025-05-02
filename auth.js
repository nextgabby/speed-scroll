require('dotenv').config();
const express = require('express');
const { TwitterApi } = require('twitter-api-v2');

const app = express();
const port = 3000;

let sessionStore = {}; // Replace this with a real session store in production

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
});

app.get('/login', async (req, res) => {
  try {
    const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink('http://localhost:3000/callback').then(link => console.log('✅ Success:', link.url))
    .catch(err => console.error('❌ Failed:', err));
    sessionStore = { oauth_token, oauth_token_secret };
    res.redirect(url);
  } catch (err) {
    console.error('🔴 Error generating auth link:', err);
    res.status(500).send('Failed to authenticate');
  }
});

app.get('/callback', async (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;
  const { oauth_token: requestToken, oauth_token_secret } = sessionStore;

  if (!oauth_token || !oauth_verifier || oauth_token !== requestToken) {
    return res.status(400).send('Invalid OAuth callback');
  }

  const tempClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: requestToken,
    accessSecret: oauth_token_secret,
  });

  try {
    const {
      client: userClient,
      accessToken,
      accessSecret,
    } = await tempClient.login(oauth_verifier);

    const user = await userClient.v1.verifyCredentials();
    console.log('✅ Authenticated as', user.screen_name);
    console.log('🔑 Access Token:', accessToken);
    console.log('🔐 Access Secret:', accessSecret);

    res.send(`Welcome @${user.screen_name}! Your access tokens are in the server logs.`);
  } catch (err) {
    console.error('🔴 OAuth callback error:', err);
    res.status(500).send('OAuth failed');
  }
});

app.listen(port, () => {
  console.log(`🚀 Go to http://localhost:${port}/login to start OAuth`);
});
