import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testEmbedding() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY is not set in .env file');
      return;
    }

    console.log('🔑 Gemini API Key found');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });

    console.log('🧪 Testing embedding with sample text...');
    const result = await model.embedContent('test');
    const embedding = result.embedding;
    
    if (embedding && embedding.values && embedding.values.length > 0) {
      console.log('✅ Embedding successful!');
      console.log(`📏 Vector dimensions: ${embedding.values.length}`);
    } else {
      console.error('❌ Received empty embedding');
    }
  } catch (error) {
    console.error('❌ Error testing embedding service:');
    console.error(error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
  }
}

testEmbedding();
