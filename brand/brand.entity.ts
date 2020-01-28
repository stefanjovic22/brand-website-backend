import { DatabaseEntity } from '../database/database.entity'
import { JSONObject } from 'typings/jsonObject'

export class BrandEntity extends DatabaseEntity {
  brandId: BrandDatabaseFields['brand_id']
  brandName: BrandDatabaseFields['brand_name']
  websiteUrl: BrandDatabaseFields['website_url']
  domainSlug: BrandDatabaseFields['domain_slug']
  locale: BrandDatabaseFields['locale']
  hadGuidelines: BrandDatabaseFields['had_guidelines']
  isPublished: BrandDatabaseFields['is_published']
  onboardingStatus: BrandDatabaseFields['onboarding_status']
}

export interface BrandDatabaseFields {
  brand_id: string
  brand_name: string
  website_url: string
  locale: string
  domain_slug: string
  had_guidelines: string
  is_published: boolean
  onboarding_status: JSONObject
}
