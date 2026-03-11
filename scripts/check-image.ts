import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import https from 'https';
import http from 'http';

async function analyzeImage() {
  try {
    const zai = await ZAI.create();
    
    const imagePath = '/home/z/my-project/upload/IMG_2860.png';
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Use data URL format for base64 image
    const dataUrl = `data:image/png;base64,${base64Image}`;
    
    const response = await zai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What does this screenshot show? Describe any error messages, server status, or issues visible. Extract all text from the image.'
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ]
    } as any);

    console.log('Analysis:', response.choices[0]?.message?.content);
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

analyzeImage();
