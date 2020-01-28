import { Test, TestingModule } from '@nestjs/testing';
import { BrandResolver } from './brand.resolver';

describe('BrandResolver', () => {
  let resolver: BrandResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BrandResolver],
    }).compile();

    resolver = module.get<BrandResolver>(BrandResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
