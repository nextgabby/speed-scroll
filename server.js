const express = require("express");
const { TwitterApi } = require("twitter-api-v2");
const dotenv = require("dotenv");
const fs = require("fs");
const crypto = require("crypto");

dotenv.config();

const app = express();
app.use(express.json());

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

app.get("/webhook", (req, res) => {
  const crc_token = req.query.crc_token;
  if (!crc_token) return res.status(400).send("Error: crc_token missing");

  const hash = crypto.createHmac("sha256", process.env.TWITTER_API_SECRET)
    .update(crc_token)
    .digest("base64");

  res.json({ response_token: `sha256=${hash}` });
});


app.get("/", (req, res) => res.send("speed scroll app is running"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`App listening on port: ${PORT}`));
