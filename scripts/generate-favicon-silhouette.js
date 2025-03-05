const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create a 512x512 canvas (we'll resize down later)
const width = 512;
const height = 512;
const centerX = width / 2;
const centerY = height / 2;

// Create an SVG that represents a silhouette timeline with vertical bars and photo frames
const svgImage = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Definitions for gradients -->
  <defs>
    <!-- Clean, elegant gradient -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2c3e50" />
      <stop offset="100%" stop-color="#1a2a3a" />
    </linearGradient>
  </defs>
  
  <!-- Main background circle -->
  <circle cx="${centerX}" cy="${centerY}" r="${width/2}" fill="url(#bgGradient)" />
  
  <!-- Vertical bars of different heights representing time (symmetrical) -->
  <rect x="${centerX-140}" y="${centerY+20}" width="20" height="100" fill="#ffffff" opacity="0.7" />
  <rect x="${centerX-100}" y="${centerY-20}" width="20" height="140" fill="#ffffff" opacity="0.8" />
  <rect x="${centerX-60}" y="${centerY-60}" width="20" height="180" fill="#ffffff" opacity="0.9" />
  <rect x="${centerX-20}" y="${centerY-100}" width="40" height="220" fill="#ffffff" />
  <rect x="${centerX+20}" y="${centerY-60}" width="20" height="180" fill="#ffffff" opacity="0.9" />
  <rect x="${centerX+60}" y="${centerY-20}" width="20" height="140" fill="#ffffff" opacity="0.8" />
  <rect x="${centerX+100}" y="${centerY+20}" width="20" height="100" fill="#ffffff" opacity="0.7" />
  
  <!-- Photo frames representing events (symmetrical) -->
  <rect x="${centerX-120}" y="${centerY-100}" width="60" height="50" rx="2" ry="2" stroke="#ffffff" stroke-width="4" fill="none" />
  <rect x="${centerX+40}" y="${centerY-100}" width="60" height="50" rx="2" ry="2" stroke="#ffffff" stroke-width="4" fill="none" />
  <rect x="${centerX-80}" y="${centerY-160}" width="60" height="50" rx="2" ry="2" stroke="#ffffff" stroke-width="4" fill="none" />
  <rect x="${centerX+0}" y="${centerY-160}" width="60" height="50" rx="2" ry="2" stroke="#ffffff" stroke-width="4" fill="none" />
  
  <!-- Horizontal line connecting everything -->
  <line x1="${centerX-150}" y1="${centerY+120}" x2="${centerX+130}" y2="${centerY+120}" 
        stroke="#ffffff" stroke-width="4" stroke-opacity="0.5" />
</svg>
`;

// Create the favicon in multiple sizes
async function generateFavicon() {
  try {
    // Convert SVG to PNG
    const pngBuffer = await sharp(Buffer.from(svgImage))
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
    
    // Save the favicon to the public directory
    await sharp(pngBuffer)
      .resize(32, 32)
      .toFile('public/favicon.ico');
    
    // Also save to app directory for Next.js
    await sharp(pngBuffer)
      .resize(32, 32)
      .toFile('app/favicon.ico');
    
    // Save larger versions for different devices
    await sharp(pngBuffer)
      .resize(192, 192)
      .toFile('public/icon-192.png');
    
    await sharp(pngBuffer)
      .resize(512, 512)
      .toFile('public/icon-512.png');
    
    console.log('Silhouette favicon and icons generated successfully!');
  } catch (error) {
    console.error('Error generating silhouette favicon:', error);
  }
}

generateFavicon(); 