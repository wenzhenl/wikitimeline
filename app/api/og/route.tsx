import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title')

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          backgroundImage: 'linear-gradient(to bottom right, #3b82f6, #8b5cf6)',
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontStyle: 'normal',
            color: 'white',
            marginTop: 30,
            padding: '0 120px',
            lineHeight: 1.2,
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 30,
            color: 'rgba(255, 255, 255, 0.9)',
            marginTop: 20,
          }}
        >
          Interactive Timeline
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
} 