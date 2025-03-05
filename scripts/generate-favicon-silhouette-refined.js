const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create a 512x512 canvas (we'll resize down later)
const width = 512;
const height = 512;
const centerX = width / 2;
const centerY = height / 2;

// Create an SVG that represents a refined silhouette timeline
const svgImage = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Definitions for gradients -->
  <defs>
    <!-- Elegant gradient background -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34495e" />
      <stop offset="100%" stop-color="#2c3e50" />
    </linearGradient>
    
    <!-- Subtle glow filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  
  <!-- Main background circle -->
  <circle cx="${centerX}" cy="${centerY}" r="${width/2}" fill="url(#bgGradient)" />
  
  <!-- Central vertical line -->
  <line x1="${centerX}" y1="${centerY-140}" x2="${centerX}" y2="${centerY+140}" 
        stroke="#ffffff" stroke-width="2" stroke-opacity="0.3" />
  
  <!-- Vertical bars of different heights (symmetrical arrangement) -->
  <rect x="${centerX-120}" y="${centerY+30}" width="16" height="80" fill="#ffffff" opacity="0.6" rx="2" ry="2" />
  <rect x="${centerX-90}" y="${centerY-10}" width="16" height="120" fill="#ffffff" opacity="0.7" rx="2" ry="2" />
  <rect x="${centerX-60}" y="${centerY-50}" width="16" height="160" fill="#ffffff" opacity="0.8" rx="2" ry="2" />
  <rect x="${centerX-30}" y="${centerY-90}" width="16" height="200" fill="#ffffff" opacity="0.9" rx="2" ry="2" />
  <rect x="${centerX+14}" y="${centerY-90}" width="16" height="200" fill="#ffffff" opacity="0.9" rx="2" ry="2" />
  <rect x="${centerX+44}" y="${centerY-50}" width="16" height="160" fill="#ffffff" opacity="0.8" rx="2" ry="2" />
  <rect x="${centerX+74}" y="${centerY-10}" width="16" height="120" fill="#ffffff" opacity="0.7" rx="2" ry="2" />
  <rect x="${centerX+104}" y="${centerY+30}" width="16" height="80" fill="#ffffff" opacity="0.6" rx="2" ry="2" />
  
  <!-- Photo frames representing events (symmetrical) -->
  <rect x="${centerX-110}" y="${centerY-120}" width="50" height="40" rx="3" ry="3" stroke="#ffffff" stroke-width="3" fill="none" />
  <rect x="${centerX-40}" y="${centerY-150}" width="50" height="40" rx="3" ry="3" stroke="#ffffff" stroke-width="3" fill="none" />
  <rect x="${centerX+60}" y="${centerY-120}" width="50" height="40" rx="3" ry="3" stroke="#ffffff" stroke-width="3" fill="none" />
  <rect x="${centerX-10}" y="${centerY-80}" width="20" height="20" rx="2" ry="2" fill="#ffffff" opacity="0.9" />
  
  <!-- Horizontal baseline -->
  <line x1="${centerX-140}" y1="${centerY+110}" x2="${centerX+140}" y2="${centerY+110}" 
        stroke="#ffffff" stroke-width="3" stroke-opacity="0.5" />
        
  <!-- Small dots representing timeline points -->
  <circle cx="${centerX-120}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX-90}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX-60}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX-30}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX+30}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX+60}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX+90}" cy="${centerY+110}" r="4" fill="#ffffff" />
  <circle cx="${centerX+120}" cy="${centerY+110}" r="4" fill="#ffffff" />
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
    
    console.log('Refined silhouette favicon and icons generated successfully!');
  } catch (error) {
    console.error('Error generating refined silhouette favicon:', error);
  }
}

generateFavicon(); 