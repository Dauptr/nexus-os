import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function analyzeImage() {
  try {
    const zai = await ZAI.create();
    
    // Read image file and convert to base64
    const imagePath = '/home/z/my-project/upload/IMG_2860.png';
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What does this screenshot show? Describe any error messages, server status, or issues visible. If there is text, please extract and transcribe it.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    });

    console.log('Analysis:', response.choices[0]?.message?.content);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

analyzeImage();
