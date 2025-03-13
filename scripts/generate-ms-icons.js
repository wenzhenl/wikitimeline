const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Create Microsoft tile icons from our existing icon
async function generateMsIcons() {
  try {
    // Read the source icon
    const sourceBuffer = await fs.promises.readFile("public/icon-512.png");

    // Generate Microsoft tile icons in different sizes
    const sizes = [70, 150, 310];

    // Generate each size
    await Promise.all(
      sizes.map(async (size) => {
        await sharp(sourceBuffer)
          .resize(size, size)
          .toFile(`public/icon-${size}.png`);

        console.log(`Generated icon-${size}.png`);
      }),
    );

    console.log("Microsoft tile icons generated successfully!");
  } catch (error) {
    console.error("Error generating Microsoft tile icons:", error);
  }
}

generateMsIcons();
