export async function GET(
  request: Request,
  { params }: { params: { pageName: string } }
) {
  const pageName = decodeURIComponent(params.pageName);
  // ... rest of the API logic
} 