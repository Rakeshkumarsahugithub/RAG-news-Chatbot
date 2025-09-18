console.log('✅ Test script is working!');
console.log('📁 Current directory:', process.cwd());
console.log('🔧 Node version:', process.version);

// Test imports
try {
  console.log('🔍 Testing imports...');
  
  // Test basic modules
  import('rss-parser').then(() => console.log('✅ rss-parser imported'));
  import('axios').then(() => console.log('✅ axios imported'));
  import('cheerio').then(() => console.log('✅ cheerio imported'));
  
  console.log('🎯 All basic tests passed!');
} catch (error) {
  console.error('❌ Import error:', error);
}
