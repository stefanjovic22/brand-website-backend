import { Resolver, Query, Args, Mutation } from '@nestjs/graphql'
import { Logger, UseGuards } from '@nestjs/common'
import { LogoService } from './logo.service'
import { AuthGuard } from '../auth/auth.guard'
import { LogoPayload, Success } from 'typings/graphql.schema'
import { BrandEntity } from '@module/brand/brand.entity'
import { SubscriptionGuard } from '@module/subscription/subscription.guard'
import { LogoSpacingObject } from './logo.entity';

@Resolver('Logo')
export class LogoResolver {
  constructor(private readonly logoService: LogoService) { }
  private readonly logger = new Logger(LogoResolver.name)

  @Query()
  // @UseGuards(AuthGuard, SubscriptionGuard)
  async logosByBrandId(
    @Args('brandId') brandId: BrandEntity['brandId'],
  ): Promise<LogoPayload[]> {
    return await this.logoService.logosByBrandId(brandId).then(({ logos }) => {
      // this.logger.log(`logosByBrandId - logos -> ${JSON.stringify(logos)}`)
      return logos
    })
  }

  @Query()
  // @UseGuards(AuthGuard, SubscriptionGuard)
  async logoByObjId(
    @Args('brandId') brandId: BrandEntity['brandId'],
    @Args('_id') objId: string,
  ): Promise<LogoPayload> {
    return await this.logoService.logoByObjId(brandId, objId)
  }

  @Mutation()
  // @UseGuards(AuthGuard, SubscriptionGuard)
  async replaceLogoSpacingObj(
    @Args('brandId') brandId: BrandEntity['brandId'],
    @Args('_id') objId: string,
    @Args('spacing') logoSpacingObj: LogoSpacingObject,
  ): Promise<Success> {
    return await this.logoService.replaceLogoSpacingObj(brandId, objId, logoSpacingObj)
  }

  @Mutation()
  async encodeLogo(
    @Args('imageFile') imageFile: string,
    @Args('fileExt') fileExt: string,
    @Args('brandId') brandId: BrandEntity['brandId'],
  ): Promise<LogoPayload> {
    return await this.logoService.encodeLogo(imageFile, fileExt, brandId).then((logo) => {
      this.logger.log(`encodeLogo - logo -> ${JSON.stringify(logo)}`)
      return logo
    })
  }
}
