import { SITE_CONFIG } from '@/app/config/site'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const pageName = url?.split('/timeline/')[1]

  if (!pageName) {
    return Response.json({ error: 'Invalid URL' }, { status: 400 })
  }

  return Response.json({
    version: '1.0',
    type: 'rich',
    provider_name: 'WikiTimeline',
    provider_url: SITE_CONFIG.DOMAIN,
    title: decodeURIComponent(pageName).replace(/_/g, ' '),
    html: `<iframe width="560" height="315" src="${SITE_CONFIG.DOMAIN}/timeline/${pageName}/embed" frameborder="0"></iframe>`,
    width: 560,
    height: 315
  })
} 