const express = require("express");
const { TwitterApi } = require("twitter-api-v2");
const dotenv = require("dotenv");
const fs = require("fs");
const crypto = require("crypto");

dotenv.config();

const app = express();
app.use(express.json());

const responses = JSON.parse(fs.readFileSync("responses.json", "utf8"));
const userSessions = new Map(); // Track user conversations

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = twitterClient.readWrite;

(async () => {
  try {
    const user = await twitterClient.v2.me();
    console.log("✅ Authenticated as:", user);
  } catch (error) {
    console.error("Twitter API Authentication Error:", error);
  }
})();

// **Send DM Function** (Ensures messages are sent in order)
async function sendDM(recipientId, messages) {
  try {
    if (!Array.isArray(messages)) messages = [messages]; // Ensure it's an array

    for (const message of messages) {
      await rwClient.v2.sendDmToParticipant(recipientId, { text: message });
      console.log(`✅ Sent message to ${recipientId}: ${message}`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 sec delay between messages
    }
  } catch (error) {
    console.error("❌ Error sending DM:", error);
  }
}

// **Webhook to Handle Incoming DMs**
app.post("/webhook", async (req, res) => {
  try {
    if (!req.body || !req.body.direct_message_events || req.body.direct_message_events.length === 0) {
      console.error("Invalid request received:", req.body);
      return res.sendStatus(400);
    }

    const event = req.body.direct_message_events[0];
    if (!event || event.type !== "message_create") {
      console.error("Invalid message event:", event);
      return res.sendStatus(400);
    }

    const senderId = event.message_create.sender_id;
    const text = event.message_create.message_data.text.trim().toLowerCase();

    console.log(`Received DM from ${senderId}: ${text}`);

    if (!text || !senderId) {
      console.error("Missing text or sender ID:", event);
      return res.sendStatus(400);
    }

    // **Prevent duplicate responses**
    if (userSessions.has(senderId) && userSessions.get(senderId) === event.id) {
      console.log("Duplicate message detected. Skipping response.");
      return res.sendStatus(200);
    }
    userSessions.set(senderId, event.id);

    let responseMessages = [];

    // **Process user input**
    if (["hi", "hello", "hi h.e.r.b.i.e"].includes(text)) {
      responseMessages = responses.start;
    } else if (text === "flame off") {
      responseMessages = responses.flameoff;
      userSessions.delete(senderId); // End session
    } else if (responses[text]) {
      responseMessages = responses[text];
    } else {
      responseMessages = ["I didn't understand that. Reply with 1, 2, 3, 4, or 'Flame Off' to end the chat."];
    }

    await sendDM(senderId, responseMessages);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error processing webhook request:", error);
    res.sendStatus(500);
  }
});

// **CRC Challenge Response (for Twitter webhook validation)**
app.get("/webhook", (req, res) => {
  const crc_token = req.query.crc_token;

  if (!crc_token) {
    return res.status(400).send("Error: crc_token missing from request");
  }

  const hash = crypto.createHmac("sha256", process.env.TWITTER_API_SECRET)
    .update(crc_token)
    .digest("base64");

  res.json({ response_token: `sha256=${hash}` });
});

// **Test Route to Check Server Status**
app.get("/", (req, res) => res.send("H.E.R.B.I.E. is running!"));

// **Start Server**
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 App listening on port: ${PORT}`));
