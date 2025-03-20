const express = require("express");
const { TwitterApi } = require("twitter-api-v2");
const dotenv = require("dotenv");
const fs = require("fs");
const security = require('./security');

dotenv.config(); // Load environment variables

const app = express();
app.use(express.json());

// ✅ Load responses from JSON file
const responses = JSON.parse(fs.readFileSync("responses.json", "utf8"));

// ✅ Twitter API Client Setup (OAuth 1.0a for DMs)
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = twitterClient.readWrite;

// ✅ Send DM Function
async function sendDM(recipientId, messages) {
  try {
    if (!Array.isArray(messages)) messages = [messages];

    for (const message of messages) {
      await rwClient.v2.sendDmToParticipant(recipientId, { text: message });
      console.log(`✅ Sent message to ${recipientId}: ${message}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 sec delay
    }
  } catch (error) {
    console.error("❌ Error sending DM:", error);
  }
}

// ✅ Webhook to Handle Incoming DMs
app.post("/webhook", async (req, res) => {
  const event = req.body.data;
  if (!event || !event.text || !event.sender_id) return res.sendStatus(400);

  const text = event.text.toLowerCase().trim();
  const recipientId = event.sender_id;

  if (text === "hi" || text === "hello") {
    await sendDM(recipientId, responses.start);
  } else if (responses[text]) {
    await sendDM(recipientId, responses[text]);
  } else {
    await sendDM(recipientId, [
      "I didn’t quite catch that. Please reply with 1, 2, 3, 4, or ‘Flame Off’ to end the chat.",
    ]);
  }

  res.sendStatus(200);
});

// CRC Challenge Response (for Twitter webhook validation)
app.get('/webhook', function(request, response) {

    var crc_token = request.query.crc_token
  
    if (crc_token) {
      var hash = security.get_challenge_response(crc_token, auth.twitter_oauth.consumer_secret)
  
      response.status(200);
      response.send({
        response_token: 'sha256=' + hash
      })
    } else {
      response.status(400);
      response.send('Error: crc_token missing from request')
    }
  })

// Test Route to Check Server Status
app.get("/", (req, res) => res.send("H.E.R.B.I.E. is running!"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 App listening on port: ${PORT}`));
