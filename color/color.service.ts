import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@module/database/database.service';
import { BrandEntity } from '@module/brand/brand.entity';
import { ColorEntity, ColorObject } from './color.entity';
import { Success } from 'typings/graphql.schema';

@Injectable()
export class ColorService {
  constructor(
    private readonly db: DatabaseService,
  ) { }
  private readonly logger = new Logger(ColorService.name)

  async colorsByBrandId(
    brandId: BrandEntity['brandId'],
  ): Promise<ColorEntity> {
    const colors = await this.db.conn
      .one(
        `SELECT draft_guideline_obj->'colors' as colors
          FROM draft_guidelines
          WHERE brand_id = $1 and deleted_at is null
          AND draft_guideline_id IN (
            SELECT draft_guideline_id
            FROM brands
            WHERE brand_id = $1
          )`,
        [brandId],
      )
    // this.logger.log(`colorByBrandId - colors -> ${JSON.stringify(colors)}`)
    return colors
  }

  async addColor(
    brandId: BrandEntity['brandId'],
    colorObj: ColorObject,
  ): Promise<Success> {
    this.logger.log(`addColor - service - colorObj -> ${JSON.stringify(colorObj)}`)
    return await this.db.conn.one(
      `update draft_guidelines
        set draft_guideline_obj = jsonb_set(
          draft_guideline_obj,
          '{colors}'::text[],
          draft_guideline_obj->'colors' || $2::jsonb
        )
        where draft_guideline_id IN (
          SELECT draft_guideline_id
          FROM brands
          WHERE brand_id = $1
        ) and deleted_at is null
        returning true as success;`,
      [brandId, colorObj],
    )
  }

  async updateSelectedColorMode(
    brandId: BrandEntity['brandId'],
    objId: string,
    selectedColorMode: ColorObject['selectedColorMode'],
  ): Promise<Success> {
    return await this.db.conn.one(
      `with guideline as (
        SELECT draft_guideline_obj->'colors' as colors
        FROM draft_guidelines
        where draft_guideline_id IN (
          SELECT draft_guideline_id
          FROM brands
          WHERE brand_id = $1
        ) and deleted_at is null
      ),
      obj as (
        select index-1 as idx
        from guideline,jsonb_array_elements(colors)
        with ordinality arr(i, index)
        where i->>'_id' = $2
      ),
      item_path as (
        select (
          '{colors,'||obj.idx||',selectedColorMode}'
        )::text[] as selectedColorMode
        from obj
      )
      update draft_guidelines
      set draft_guideline_obj = jsonb_set(
        draft_guideline_obj,
        item_path.selectedColorMode, $3::jsonb
      )
      from item_path
      where draft_guideline_id IN (
        SELECT draft_guideline_id
        FROM brands
        WHERE brand_id = $1
      ) returning true as success;`,
      [brandId, objId, JSON.stringify(selectedColorMode)],
    )
  }
}
