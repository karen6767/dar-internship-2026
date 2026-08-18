require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function testGemini() {
  try {
    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: "Say hello in one sentence.",
    });

    console.log("Gemini response:");
    console.log(interaction.output_text);
  } catch (error) {
    console.error("Gemini error:");
    console.error(error.message);
  }
}

testGemini();