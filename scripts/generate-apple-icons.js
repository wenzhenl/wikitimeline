const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Create Apple Touch Icons from our existing icon
async function generateAppleIcons() {
  try {
    // Read the source icon
    const sourceBuffer = await fs.promises.readFile("public/icon-512.png");

    // Generate Apple Touch Icons in different sizes
    const sizes = [57, 60, 72, 76, 114, 120, 144, 152, 180];

    // Create the icons directory if it doesn't exist
    if (!fs.existsSync("public/apple-touch-icon")) {
      fs.mkdirSync("public/apple-touch-icon", { recursive: true });
    }

    // Generate each size
    await Promise.all(
      sizes.map(async (size) => {
        await sharp(sourceBuffer)
          .resize(size, size)
          .toFile(`public/apple-touch-icon-${size}x${size}.png`);

        console.log(`Generated apple-touch-icon-${size}x${size}.png`);
      }),
    );

    // Create the default apple-touch-icon.png (180x180)
    await sharp(sourceBuffer)
      .resize(180, 180)
      .toFile("public/apple-touch-icon.png");

    console.log("Apple Touch Icons generated successfully!");
  } catch (error) {
    console.error("Error generating Apple Touch Icons:", error);
  }
}

generateAppleIcons();
