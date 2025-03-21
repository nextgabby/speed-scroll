const express = require("express");
const { TwitterApi } = require("twitter-api-v2");
const dotenv = require("dotenv");
const fs = require("fs");
const crypto = require("crypto");

dotenv.config(); // Load environment variables

const app = express();
app.use(express.json());

// Load responses from JSON file
const responses = JSON.parse(fs.readFileSync("responses.json", "utf8"));


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
  
// Send DM Function (Ensures Each Message is Sent Individually)
async function sendDM(recipientId, messages) {
    try {
      if (!Array.isArray(messages)) messages = [messages];
  
      for (const message of messages) {
        console.log(`✅ Sending message to ${recipientId}: ${message}`);
  
        await rwClient.v2.sendDmToParticipant(recipientId, { text: message });
  
        // Wait 1 second before sending the next message (preventing spam)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("❌ Error sending DM:", error);
    }
  }
  
  

// Webhook to Handle Incoming DMs
app.post("/webhook", async (req, res) => {
    const event = req.body;

    console.log("Incoming Event:", JSON.stringify(event, null, 2));

    // Ensure there's an event and it contains a DM event
    if (!event || !event.direct_message_events || !event.direct_message_events.length) {
        console.log("No valid DM event found.");
        return res.sendStatus(400);
    }

    // Extract the first DM event
    const dmEvent = event.direct_message_events[0];

    // Ensure it's a message_create event
    if (dmEvent.type !== "message_create") {
        console.log("Not a message_create event, ignoring.");
        return res.sendStatus(400);
    }

    // Extract message text and sender ID
    const senderId = dmEvent.message_create.sender_id;
    const text = dmEvent.message_create.message_data.text.toLowerCase().trim();

    console.log(`Received DM from ${senderId}: ${text}`);

    // Prevent bot from responding to itself
    if (senderId === process.env.TWITTER_USER_ID) {
        console.log("Ignoring message from the bot itself.");
        return res.sendStatus(200);
    }

    // Check responses.json for matching message
    if (text === "hi" || text === "hello" || text === "hi h.e.r.b.i.e") {
        await sendDM(recipientId, responses.start);
      } else if (responses[text]) {
        await sendDM(recipientId, responses[text]);
      } else {
        await sendDM(recipientId, [
          "I didn’t quite catch that. Reply with 1, 2, 3, 4, or ‘Flame Off’ to end the chat."
        ]);
      }

    res.sendStatus(200);
});


// CRC Challenge Response (for Twitter webhook validation)
app.get("/webhook", (req, res) => {
  const crc_token = req.query.crc_token;
  
  if (!crc_token) {
    return res.status(400).send("Error: crc_token missing from request");
  }

  // Generate SHA-256 HMAC hash using Twitter API Secret
  const hash = crypto.createHmac("sha256", process.env.TWITTER_API_SECRET)
    .update(crc_token)
    .digest("base64");

  res.json({ response_token: `sha256=${hash}` });
});

// Test Route to Check Server Status
app.get("/", (req, res) => res.send("H.E.R.B.I.E. is running!"));

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`App listening on port: ${PORT}`));
