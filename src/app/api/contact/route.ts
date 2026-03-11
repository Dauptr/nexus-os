import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();
    
    // Log the contact request (in production, you'd send an email)
    console.log('📧 Contact Form Submission:');
    console.log(`   From: ${name} <${email}>`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Message: ${message}`);
    console.log(`   → Forward to: dauptr@gmail.com`);
    
    // In production, integrate with email service (SendGrid, Resend, etc.)
    // For now, just log and return success
    
    return NextResponse.json({
      success: true,
      message: 'Message received! We will respond to dauptr@gmail.com',
      forwardedTo: 'dauptr@gmail.com'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
