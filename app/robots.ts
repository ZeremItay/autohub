import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://autohub.com'
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/account/', '/auth/', '/messages/', '/notifications/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

