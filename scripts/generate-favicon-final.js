const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create a 512x512 canvas (we'll resize down later)
const width = 512;
const height = 512;
const centerX = width / 2;
const centerY = height / 2;

// Read the SVG from the file
async function generateFavicon() {
  try {
    // Read the SVG file
    const svgContent = fs.readFileSync('public/favicon.svg', 'utf8');
    
    // Convert SVG to PNG
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .png()
      .toBuffer();
    
    // Create different sizes for the favicon
    const sizes = [16, 32, 48, 64, 128, 256];
    const resizedImages = await Promise.all(
      sizes.map(size => 
        sharp(pngBuffer)
          .resize(size, size)
          .toBuffer()
      )
    );
    
    // Save the favicon to the public directory - increased to 48x48 for better visibility
    await sharp(pngBuffer)
      .resize(48, 48)
      .toFile('public/favicon.ico');
    
    // Also save to app directory for Next.js - increased to 48x48 for better visibility
    await sharp(pngBuffer)
      .resize(48, 48)
      .toFile('app/favicon.ico');
    
    // Save larger versions for different devices
    await sharp(pngBuffer)
      .resize(192, 192)
      .toFile('public/icon-192.png');
    
    await sharp(pngBuffer)
      .resize(512, 512)
      .toFile('public/icon-512.png');
    
    console.log('Final favicon and icons generated successfully!');
  } catch (error) {
    console.error('Error generating final favicon:', error);
  }
}

generateFavicon(); 