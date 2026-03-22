import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyD2QDkPe4gIV96f6gvXVygQ_IBRslizMZ8";
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    const models = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await models.json();
    console.log(data.models.map(m => m.name).join("\n"));
  } catch (e) {
    console.error(e);
  }
}
run();
