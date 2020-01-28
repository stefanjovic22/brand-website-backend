import { Module } from '@nestjs/common'
import { BrandService } from './brand.service'
import { BrandResolver } from './brand.resolver'

@Module({
  providers: [BrandService, BrandResolver],
})
export class BrandModule { }
