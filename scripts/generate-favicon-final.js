const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create a 512x512 canvas (we'll resize down later)
const width = 512;
const height = 512;
const centerX = width / 2;
const centerY = height / 2;

// Create an SVG that represents a perfectly symmetrical timeline
const svgImage = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Definitions for gradients -->
  <defs>
    <!-- Elegant gradient background -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34495e" />
      <stop offset="100%" stop-color="#2c3e50" />
    </linearGradient>
  </defs>
  
  <!-- Main background circle -->
  <circle cx="${centerX}" cy="${centerY}" r="${width/2}" fill="url(#bgGradient)" />
  
  <!-- Vertical bars in a varied, non-increasing pattern (perfectly symmetrical) -->
  <!-- Left side -->
  <rect x="${centerX-140}" y="${centerY-20}" width="16" height="130" fill="#ffffff" opacity="0.7" rx="2" ry="2" />
  <rect x="${centerX-110}" y="${centerY-60}" width="16" height="170" fill="#ffffff" opacity="0.8" rx="2" ry="2" />
  <rect x="${centerX-80}" y="${centerY-30}" width="16" height="140" fill="#ffffff" opacity="0.7" rx="2" ry="2" />
  <rect x="${centerX-50}" y="${centerY-80}" width="16" height="190" fill="#ffffff" opacity="0.9" rx="2" ry="2" />
  <rect x="${centerX-20}" y="${centerY-40}" width="16" height="150" fill="#ffffff" opacity="0.8" rx="2" ry="2" />
  
  <!-- Center bar -->
  <rect x="${centerX-8}" y="${centerY-100}" width="16" height="210" fill="#ffffff" rx="2" ry="2" />
  
  <!-- Right side (mirrored from left) -->
  <rect x="${centerX+4}" y="${centerY-40}" width="16" height="150" fill="#ffffff" opacity="0.8" rx="2" ry="2" />
  <rect x="${centerX+34}" y="${centerY-80}" width="16" height="190" fill="#ffffff" opacity="0.9" rx="2" ry="2" />
  <rect x="${centerX+64}" y="${centerY-30}" width="16" height="140" fill="#ffffff" opacity="0.7" rx="2" ry="2" />
  <rect x="${centerX+94}" y="${centerY-60}" width="16" height="170" fill="#ffffff" opacity="0.8" rx="2" ry="2" />
  <rect x="${centerX+124}" y="${centerY-20}" width="16" height="130" fill="#ffffff" opacity="0.7" rx="2" ry="2" />
  
  <!-- Photo frames representing events (perfectly symmetrical) -->
  <rect x="${centerX-110}" y="${centerY-130}" width="50" height="40" rx="3" ry="3" stroke="#ffffff" stroke-width="3" fill="none" />
  <rect x="${centerX-25}" y="${centerY-160}" width="50" height="40" rx="3" ry="3" stroke="#ffffff" stroke-width="3" fill="none" />
  <rect x="${centerX+60}" y="${centerY-130}" width="50" height="40" rx="3" ry="3" stroke="#ffffff" stroke-width="3" fill="none" />
  
  <!-- Horizontal baseline -->
  <line x1="${centerX-150}" y1="${centerY+110}" x2="${centerX+150}" y2="${centerY+110}" 
        stroke="#ffffff" stroke-width="3" stroke-opacity="0.5" />
        
  <!-- Small dots representing timeline points (perfectly symmetrical) -->
  <circle cx="${centerX-125}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX-100}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX-75}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX-50}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX-25}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX+25}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX+50}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX+75}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX+100}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX+125}" cy="${centerY+110}" r="4" fill="#ffffff" />
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
    
    console.log('Final favicon and icons generated successfully!');
  } catch (error) {
    console.error('Error generating final favicon:', error);
  }
}

generateFavicon(); 