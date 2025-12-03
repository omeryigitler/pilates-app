import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://www.reformerpilatesmalta.com',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
    ];
}
