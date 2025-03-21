const express = require("express");
const { TwitterApi } = require("twitter-api-v2");
const dotenv = require("dotenv");
const fs = require("fs");
const crypto = require("crypto");

dotenv.config();

const app = express();
app.use(express.json());

const responses = JSON.parse(fs.readFileSync("responses.json", "utf8"));

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = twitterClient.readWrite;

// Authenticate
(async () => {
  try {
    const user = await twitterClient.v2.me();
    console.log("✅ Authenticated as:", user);
  } catch (error) {
    console.error("Twitter API Authentication Error:", error);
  }
})();

// **Send DM Function (Ensures Ordered Messages with Delay)**
async function sendDM(recipientId, messages) {
  if (!Array.isArray(messages)) messages = [messages];

  for (const message of messages) {
    try {
      await rwClient.v2.sendDmToParticipant(recipientId, { text: message });
      console.log(`✅ Sent to ${recipientId}: ${message}`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 sec delay
    } catch (error) {
      console.error("❌ DM Error:", error);
    }
  }
}

// **Webhook to Handle Incoming DMs**
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body?.direct_message_events?.[0];

    if (!event || event.type !== "message_create") {
      console.error("Invalid message event:", event);
      return res.sendStatus(400);
    }

    const senderId = event.message_create.sender_id;
    const text = event.message_create.message_data.text.trim().toLowerCase();

    console.log(`Received DM from ${senderId}: ${text}`);

    let responseMessages = [
      "I didn’t understand that. Reply with 1, 2, 3, 4, or 'Flame Off' to end the chat."
    ];

    // **Check for Start Messages**
    if (text === "hi" || text === "hello" || text === "hi h.e.r.b.i.e") {
      responseMessages = responses.start;
    } else if (text === "flame off") {
      responseMessages = responses.flameoff;
    } else if (responses[text]) {
      responseMessages = responses[text];
    }

    await sendDM(senderId, responseMessages);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error processing webhook request:", error);
    res.sendStatus(500);
  }
});

// **CRC Challenge Response (for Twitter validation)**
app.get("/webhook", (req, res) => {
  const crc_token = req.query.crc_token;
  if (!crc_token) return res.status(400).send("Error: crc_token missing");

  const hash = crypto.createHmac("sha256", process.env.TWITTER_API_SECRET)
    .update(crc_token)
    .digest("base64");

  res.json({ response_token: `sha256=${hash}` });
});

// **Test Route**
app.get("/", (req, res) => res.send("H.E.R.B.I.E. is running!"));

// **Start Server**
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 App listening on port: ${PORT}`));
