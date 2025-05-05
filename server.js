require('dotenv').config();
const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const bodyParser = require('body-parser');
const crypto = require('crypto');

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
          await client.v2.tweet(message);
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
