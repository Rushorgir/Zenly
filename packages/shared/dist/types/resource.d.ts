export type ResourceItemType = 'video' | 'audio' | 'article';
export interface Resource {
    _id: string;
    title: string;
    description: string;
    type: ResourceItemType;
    categories: string[];
    tags?: string[];
    url: string;
    duration?: string;
    author?: string;
    embedData?: {
        platform?: string;
        embedId?: string;
        thumbnailUrl?: string;
    };
    isFeatured: boolean;
    viewCount: number;
    helpfulCount: number;
}
export interface FeaturedResources {
    videos: Resource[];
    audios: Resource[];
    articles: Resource[];
}
export type ResourceSectionType = 'videos' | 'audios' | 'articles';
