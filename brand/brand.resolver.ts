import { Resolver, CONTEXT, Query, Args, Mutation } from '@nestjs/graphql'
import { Inject, Logger, UseGuards } from '@nestjs/common'
import { BrandService } from './brand.service'
import { Brand, BrandOnboardingStatus } from 'typings/graphql.schema'
import { JSONObject } from 'typings/jsonObject'
import { AuthGuard } from '@module/auth/auth.guard';

@Resolver('Brand')
@UseGuards(AuthGuard)
export class BrandResolver {
  constructor(
    @Inject(CONTEXT) private readonly context,
    private readonly brandService: BrandService,
  ) { }
  private readonly logger = new Logger(BrandResolver.name)

  @Query()
  async listBrands(): Promise<Brand[]> {
    const { tenantId } = this.context.user
    return await this.brandService.listBrandsByTenantId(tenantId)
  }

  @Query()
  async getBrandOnboardingStatus(
    @Args('brandId') brandId: Brand['brandId'],
  ): Promise<BrandOnboardingStatus> {
    return await this.brandService.getBrandOnboardingStatus(brandId)
  }

  @Mutation()
  async updateBrandOnboardingStatus(
    @Args('brandId') brandId: Brand['brandId'],
    @Args('values') values: JSONObject,
  ): Promise<void> {
    return await this.brandService.updateBrandOnboardingStatus(brandId, values)
  }
}
