require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const envName = process.env.TWITTER_ENV_NAME;
const webhookUrl = process.env.WEBHOOK_URL;

(async () => {
  try {
    // Step 1: Register the webhook
    console.log('Registering webhook...');
    const webhookRes = await twitterClient.v1.post(
      `account_activity/webhooks.json`,
      { url: webhookUrl }
    );
    console.log('✅ Webhook registered:', webhookRes);

    // Step 2: Subscribe the authenticated user
    console.log('Subscribing user...');
    await twitterClient.v1.post(
      `account_activity/subscriptions.json`
    );
    console.log('✅ User subscribed to webhook events');
  } catch (error) {
    if (error.code === 214) {
      console.log('⚠️ Webhook already registered');
    } else if (error.code === 385) {
      console.log('⚠️ Already subscribed');
    } else {
      console.error('❌ Error:', error);
    }
  }
})();
