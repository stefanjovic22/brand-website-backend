import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { BrandEntity } from '@module/brand/brand.entity';
import { ColorService } from './color.service';
import { ColorPayload, Success } from 'typings/graphql.schema';
import { ColorObject } from './color.entity';
import { buildColorObj } from '@common/util/colorUtils';

@Resolver('Color')
export class ColorResolver {
  constructor(
    private readonly colorsService: ColorService,
  ) { }
  private readonly logger = new Logger(ColorResolver.name)

  @Query()
  async colorsByBrandId(
    @Args('brandId') brandId: BrandEntity['brandId']
  ): Promise<ColorPayload[]> {
    return await this.colorsService.colorsByBrandId(brandId).then(({ colors }) => {
      // this.logger.log(`colorsByBrandId - typographies -> ${JSON.stringify(colors)}`)
      return colors
    })
  }

  @Mutation()
  async addColor(
    @Args('brandId') brandId: BrandEntity['brandId'],
    @Args('hex') hex: ColorObject['hex'],
  ): Promise<Success> {
    const colorObj = await buildColorObj([hex])
    return await this.colorsService.addColor(brandId, colorObj[0])
  }

  @Mutation()
  async updateSelectedColorMode(
    @Args('brandId') brandId: BrandEntity['brandId'],
    @Args('_id') objId: string,
    @Args('selectedColorMode') selectedColorMode: ColorObject['selectedColorMode'],
  ): Promise<Success> {
    return await this.colorsService.updateSelectedColorMode(brandId, objId, selectedColorMode)
  }
}
