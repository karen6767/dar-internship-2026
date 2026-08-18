const { MongoClient } = require("mongodb");

const uri = "mongodb://127.0.0.1:27017";

const client = new MongoClient(uri);

async function testMongoDB() {
  try {
    await client.connect();

    console.log("MongoDB connected successfully!");

    await client.db("chat_app").command({ ping: 1 });

    console.log("MongoDB ping successful!");
  } catch (error) {
    console.error("MongoDB error:");
    console.error(error.message);
  } finally {
    await client.close();
  }
}

testMongoDB();
