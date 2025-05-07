require('dotenv').config();
const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
const OAuth = require('oauth-1.0a');

const app = express();
app.use(bodyParser.json());

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const userLikeTimestamps = new Map();
const TWEET_1 = '1919413840577454214';
const TWEET_2 = '1919421502375563594';

const oauth = OAuth({
  consumer: {
    key: process.env.TWITTER_API_KEY,
    secret: process.env.TWITTER_API_SECRET,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

const token = {
  key: process.env.TWITTER_ACCESS_TOKEN,
  secret: process.env.TWITTER_ACCESS_SECRET,
};

app.get('/webhook', (req, res) => {
  const crcToken = req.query.crc_token;
  if (!crcToken) return res.status(400).send('Missing crc_token');
  const hmac = crypto.createHmac('sha256', process.env.TWITTER_API_SECRET).update(crcToken).digest('base64');
  res.status(200).send({ response_token: `sha256=${hmac}` });
});

// Handle like events
app.post('/webhook', async (req, res) => {
  const body = req.body;

  try {
    const events = body.favorite_events;
    if (events) {
      for (const event of events) {
        const userId = event.user.id_str;
        const username = event.user.screen_name;
        const likedTweetId = event.favorited_status.id_str;

        if (likedTweetId === TWEET_1) {
          userLikeTimestamps.set(userId, Date.now());
        } else if (likedTweetId === TWEET_2 && userLikeTimestamps.has(userId)) {
          const timeTakenMs = Date.now() - userLikeTimestamps.get(userId);
          const timeTakenSec = (timeTakenMs / 1000).toFixed(2);
          const message = `@${username} Well done — you completed the race in just ${timeTakenSec} seconds. In that time, an F1 driver can cover miles at peak performance.`;

          const url = 'https://api.twitter.com/2/tweets';
          const request_data = {
            url,
            method: 'POST',
            data: {
              text: message,
              nullcast: true
            }
          };

          const headers = oauth.toHeader(oauth.authorize(request_data, token));
          headers['Content-Type'] = 'application/json';

          await axios.post(url, request_data.data, { headers });

          userLikeTimestamps.delete(userId);
        }        
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.sendStatus(500);
  }
});

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

