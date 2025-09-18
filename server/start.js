#!/usr/bin/env node
/**
 * Startup script for RAG Chatbot
 * Handles graceful initialization with fallbacks
 */

import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config(); // Load from current directory first
dotenv.config({ path: '../.env' }); // Then parent directory as fallback

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting RAG Chatbot Application...\n');

// Check if we have API keys for full functionality
const hasGeminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10;
const hasJinaKey = process.env.JINA_API_KEY && process.env.JINA_API_KEY.length > 10;

if (!hasGeminiKey && !hasJinaKey) {
  console.log('⚠️  No API keys detected - running in demo mode');
  console.log('📝 To enable full RAG functionality:');
  console.log('   1. Get free Gemini API key: https://makersuite.google.com/');
  console.log('   2. Get free Jina API key: https://jina.ai/');
  console.log('   3. Add them to your .env file\n');
  
  console.log('🎮 Starting demo server with simulated responses...');
  startTestServer();
} else {
  console.log('🔑 API keys detected - starting full RAG server...');
  console.log(`   Gemini: ${hasGeminiKey ? '✅' : '❌'}`);
  console.log(`   Jina: ${hasJinaKey ? '✅' : '❌'}\n`);
  
  startFullServer();
}

function startTestServer() {
  const serverPath = join(__dirname, 'test-server.js');
  const server = spawn('node', [serverPath], { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  
  server.on('error', (err) => {
    console.error('❌ Failed to start test server:', err);
    process.exit(1);
  });
  
  server.on('close', (code) => {
    console.log(`Test server exited with code ${code}`);
    process.exit(code);
  });
}

function startFullServer() {
  const serverPath = join(__dirname, 'index.js');
  const server = spawn('node', [serverPath], { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  
  server.on('error', (err) => {
    console.error('❌ Failed to start full server:', err);
    console.log('\n🔄 Falling back to test server...');
    startTestServer();
  });
  
  server.on('close', (code) => {
    if (code !== 0) {
      console.log(`\n🔄 Full server failed, falling back to test server...`);
      startTestServer();
    } else {
      process.exit(code);
    }
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down RAG Chatbot...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down RAG Chatbot...');
  process.exit(0);
});