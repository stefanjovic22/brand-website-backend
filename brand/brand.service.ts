import { Injectable, Logger } from '@nestjs/common'
import { BrandEntity, BrandDatabaseFields } from './brand.entity'
import { DatabaseService } from '../database/database.service'
import { keysToCamel } from '../../common/util/keysToCamel'
import { TenantBrandsEntity } from '@module/tenant/tenant-brands.entity'
import { BrandOnboardingStatus } from 'typings/graphql.schema'
import { JSONObject } from 'typings/jsonObject'

@Injectable()
export class BrandService {
  constructor(private readonly db: DatabaseService) { }
  private readonly logger = new Logger(BrandService.name)

  async addBrand(
    tenantId: TenantBrandsEntity['tenantId'],
    websiteUrl: BrandEntity['websiteUrl'],
    hadGuidelines: BrandEntity['hadGuidelines'],
  ): Promise<BrandEntity['brandId']> {
    return await this.db.conn
      .one(
        `with new_brand as (
          insert into brands (
            website_url,
            had_guidelines
          ) values (
            $<websiteUrl>,
            $<hadGuidelines>
          ) returning brand_id
        ), new_tenant_brand as (
            insert into tenant_brands (
              tenant_id,
              brand_id,
              tenant_brand_role_slug,
              chargebee_subscription_id,
              subscription_period_ends,
              subscription_plan_slug
            ) select
                new_brand.brand_id,
                $<tenantId>,
                $<tenantRoleSlug>,
                $<chargebeeSubscriptionId>,
                $<subscriptionPeriodEnds>,
                $<subscriptionPlanSlug>
              from new_tenant, new_brand
        ) select new_brand.brand_id, new_user.user_id from new_tenant, new_brand, new_user`,
        { tenantId, websiteUrl, hadGuidelines },
      )
      .then(({ brand_id }: BrandDatabaseFields) => {
        // this.logger.log('createBrand -> brand_id -> ' + JSON.stringify(brand_id))
        return keysToCamel(brand_id)
      })
  }

  async listBrandsByTenantId(
    tenantId: TenantBrandsEntity['tenantId'],
  ): Promise<BrandEntity[]> {
    // this.logger.log(`listBrandsByTenantId - tenantId -> ${tenantId}`)
    const brands = await this.db.conn.many(
      `select * from brands b
        inner join tenant_brands tb
				on b.brand_id = tb.brand_id
      where tb.tenant_id = $1 `,
      [tenantId],
    )
    // this.logger.log(`listBrandsByTenantId - brands -> ${JSON.stringify(brands)}`)
    return keysToCamel(brands)
  }

  async getBrandOnboardingStatus(
    brandId: BrandEntity['brandId'],
  ): Promise<BrandOnboardingStatus> {
    const statuses = await this.db.conn.one(
      `select x.* from brands,
        jsonb_to_record(onboarding_status) as x(colors text, logos text, typography text, templates text)
      where brand_id = $1`,
      [brandId],
    )
    this.logger.log('getBrandOnboardingStatus - statuses -> ', statuses)
    return statuses
  }

  async updateBrandOnboardingStatus(
    brandId: BrandEntity['brandId'],
    values: JSONObject,
  ): Promise<void> {
    // this.logger.log(
    //   'getBrandOnboardingStatus - values -> ' + JSON.stringify(values),
    // )
    return await this.db.conn.none(
      `UPDATE brands SET onboarding_status = onboarding_status || $2
      where brand_id = $1`,
      [brandId, values],
    )
  }
}
