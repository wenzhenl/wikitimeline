import { SITE_CONFIG } from '@/app/config/site'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const pageName = url?.split('/timeline/')[1]?.split('?')[0]

  if (!pageName) {
    return Response.json({ error: 'Invalid URL' }, { status: 400 })
  }

  return Response.json({
    version: '1.0',
    type: 'rich',
    provider_name: 'WikiTimeline',
    provider_url: SITE_CONFIG.DOMAIN,
    title: decodeURIComponent(pageName).replace(/_/g, ' '),
    width: 560,
    height: 315,
    html: `<iframe 
      src="${SITE_CONFIG.DOMAIN}/timeline/${pageName}/embed" 
      width="560" 
      height="315" 
      frameborder="0" 
      allowfullscreen
      style="max-width: 100%;"
    ></iframe>`,
  })
} 