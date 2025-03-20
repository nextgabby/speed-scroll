const express = require("express");
const { TwitterApi } = require("twitter-api-v2");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();
const app = express();
app.use(express.json());

// ✅ Load responses from JSON file instead of hardcoding them
const responses = JSON.parse(fs.readFileSync("responses.json", "utf8"));

// ✅ Twitter API credentials
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
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    for (const message of messages) {
      await rwClient.v2.sendDmToParticipant(recipientId, { text: message });
      console.log(`✅ Sent message to ${recipientId}: ${message}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("❌ Error sending DM:", error);
  }
}

app.get("/webhook", (req, res) => {
    const crc_token = req.query.crc_token;
    if (crc_token) {
      const crypto = require("crypto");
      const hash = crypto
        .createHmac("sha256", process.env.TWITTER_API_SECRET)
        .update(crc_token)
        .digest("base64");
  
      res.json({ response_token: `sha256=${hash}` });
    } else {
      res.status(400).send("CRC token missing");
    }
  });
  

// ✅ Webhook to Handle Messages
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
    await sendDM(recipientId, ["I didn’t quite catch that. Please reply with 1, 2, 3, 4, or ‘Flame Off’ to end the chat."]);
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("H.E.R.B.I.E. is running!");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`App listening on port: ${PORT}`);
});
