const submitUrl = async () => {
  const key = 'c8de49f55e96493fbc944cdfb7880c5e'; // Replace with your actual key
  const url = 'https://wiki-timeline.com';
  
  try {
    const response = await fetch(
      `https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${key}`
    );
    console.log('Status:', response.status);
    console.log('Success:', response.ok);
  } catch (error) {
    console.error('Error:', error);
  }
};

submitUrl(); 