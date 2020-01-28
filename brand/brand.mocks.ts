import * as c from 'casual'

export const BrandMocks = {
  Brand: () => ({
    BrandID: c.uuid,
    websiteURL: c.url,
    locale: c.locale,
    hadGuidelines: c.boolean,
    isPublished: c.boolean,
    createdAt: c.date('YYYY-MM-DD'),
    updatedAt: c.date('YYYY-MM-DD'),
  }),
}
