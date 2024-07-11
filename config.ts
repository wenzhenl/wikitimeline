const isProduction = process.env.NODE_ENV === 'production';

export const BASE_URL = isProduction ? 'https://wikitimeline.top' : 'http://localhost:3000';