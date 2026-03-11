import ZAI from 'z-ai-web-dev-sdk';

async function testAPIs() {
  console.log('=== Testing z-ai-web-dev-sdk APIs ===\n');
  
  try {
    console.log('1. Initializing ZAI SDK...');
    const zai = await ZAI.create();
    console.log('   ✅ SDK initialized successfully\n');
    
    // Test Chat Completions
    console.log('2. Testing Chat Completions API...');
    try {
      const chatResponse = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "Hello" in one word.' }
        ]
      });
      console.log('   ✅ Chat API working:', chatResponse.choices[0]?.message?.content, '\n');
    } catch (e: any) {
      console.log('   ❌ Chat API failed:', e.message, '\n');
    }
    
    // Test Web Search
    console.log('3. Testing Web Search API...');
    try {
      const searchResult = await zai.functions.invoke("web_search", {
        query: "test",
        num: 1
      });
      console.log('   ✅ Web Search API working\n');
    } catch (e: any) {
      console.log('   ❌ Web Search API failed:', e.message, '\n');
    }
    
    // Test Image Generation
    console.log('4. Testing Image Generation API...');
    try {
      const imgResponse = await zai.images.generations.create({
        prompt: 'A simple test image',
        size: '1024x1024'
      });
      console.log('   ✅ Image Generation API working\n');
    } catch (e: any) {
      console.log('   ❌ Image Generation API failed:', e.message, '\n');
    }
    
    // Test Vision API
    console.log('5. Testing Vision API...');
    try {
      const visionResponse = await zai.chat.completions.createVision({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this' },
              { type: 'image_url', image_url: { url: 'https://via.placeholder.com/150' } }
            ]
          }
        ]
      });
      console.log('   ✅ Vision API working\n');
    } catch (e: any) {
      console.log('   ❌ Vision API failed:', e.message, '\n');
    }
    
  } catch (e: any) {
    console.log('❌ SDK initialization failed:', e.message);
  }
}

testAPIs();
