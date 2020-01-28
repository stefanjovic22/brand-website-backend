import { Injectable, HttpService, Logger } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { TransloaditData, TransloaditEncodeResponse, LogoObject, LogoEntity, LogoSpacingObject } from './logo.entity'
import { BrandEntity } from '../brand/brand.entity'
import * as TransloaditClient from 'transloadit'
import * as fs from 'fs'
import { promisify } from 'util'
import { v4 as uuidv4 } from 'uuid'
import { ApolloError } from 'apollo-server-errors'
import { s3Uploader } from '@common/util/s3Uploader'
import { mkTmpDir } from '@common/util/mkTmpDir'
import { Success } from 'typings/graphql.schema';

@Injectable()
export class LogoService {
  constructor(
    private readonly httpService: HttpService,
    private readonly db: DatabaseService,
  ) { }
  private readonly logger = new Logger(LogoService.name)

  async logosByBrandId(brandId: BrandEntity['brandId']): Promise<LogoEntity> {
    const logos = await this.db.conn
      .one(
        `SELECT draft_guideline_obj->'logos' as logos
          FROM draft_guidelines
          WHERE draft_guideline_id IN (
            SELECT draft_guideline_id
            FROM brands
            WHERE brand_id = $1
          ) and deleted_at is null;`,
        [brandId],
      )
    // this.logger.log(`logosByBrandId - logos -> ${JSON.stringify(logos)}`)
    return logos
  }

  async logoByObjId(
    brandId: BrandEntity['brandId'],
    objId: string,
  ): Promise<LogoObject> {
    const obj = await this.db.conn
      .one(
        `SELECT obj.value as logo
        FROM draft_guidelines
        JOIN LATERAL jsonb_array_elements(draft_guideline_obj->'logos') obj(value)
        ON obj.value->>'_id' = $2
        where draft_guideline_id IN (
          SELECT draft_guideline_id
          FROM brands
          WHERE brand_id = $1
        ) and deleted_at is null;`,
        [brandId, objId],
      )
    // this.logger.log(`logoByObjId - logo -> ${JSON.stringify(obj.logo)}`)
    return obj.logo
  }

  async replaceLogoSpacingObj(
    brandId: BrandEntity['brandId'],
    objId: string,
    logoSpacingObj: LogoSpacingObject,
  ): Promise<Success> {
    return await this.db.conn.one(
      `with guideline_logos as (
        SELECT draft_guideline_obj->'logos' as logos
        FROM draft_guidelines
        where draft_guideline_id IN (
          SELECT draft_guideline_id
          FROM brands
          WHERE brand_id = $1
        ) and deleted_at is null
      ),
      logos_obj as (
        select index-1 as idx
        from guideline_logos,jsonb_array_elements(logos)
        with ordinality arr(i, index)
        where i->>'_id' = $2
      ),
      logo_path as (
        select (
          '{logos,'||logos_obj.idx||',spacing}'
        )::text[] as spacing
        from logos_obj
      )
      update draft_guidelines
      set draft_guideline_obj = jsonb_set(
        draft_guideline_obj,
        logo_path.spacing, $3::jsonb
      )
      from logo_path
      where draft_guideline_id IN (
        SELECT draft_guideline_id
        FROM brands
        WHERE brand_id = $1
      ) returning true as success;`,
      [brandId, objId, logoSpacingObj],
    )
  }

  // encode an uploaded image file
  async encodeLogo(
    imageData: string,
    fileExt: string,
    brandId: BrandEntity['brandId'],
  ): Promise<LogoObject> {
    const writeFileAsync = promisify(fs.writeFile)
    const unlinkAsync = promisify(fs.unlink)
    // process the passed data:.* string
    const base64Data = imageData.replace(/(^data:.*base64,?)/, '')
    const buff = Buffer.from(base64Data, 'base64')
    const { logosTmpDir } = await mkTmpDir(brandId)
    const fileName = `${brandId}_${Date.now()}`
    const tempFilePath = `${logosTmpDir}/${fileName}.${fileExt}`

    await writeFileAsync(tempFilePath, buff)
    // Upload original image to s3
    const originalUrl = await s3Uploader(tempFilePath)
    // this.logger.log(`encodeLogo -> origUrl -> ${origUrl}`)
    // Encode with transloadit and uploads to s3
    const { encodedUrl, width, height, aspectRatio } = await this.transloaditEncoder(tempFilePath, brandId)
    // this.logger.log(`encodeLogo -> encodedUrl -> ${JSON.stringify(encodedUrl)}`)
    // Delete temp file upload
    unlinkAsync(tempFilePath)
    const logoObj = {
      _id: await uuidv4(),
      originalUrl,
      encodedUrl,
      encodedSize: {
        width,
        height,
        aspectRatio,
      },
    }
    // this.logger.log(`logoObj -> ${JSON.stringify(logoObj)}`)
    const resp = await this.db.conn.one(
      `update draft_guidelines
        set draft_guideline_obj = jsonb_set(
          draft_guideline_obj,
          '{logos}'::text[],
          draft_guideline_obj->'logos' || $2::jsonb
        )
        WHERE draft_guideline_id IN (
          SELECT draft_guideline_id
          FROM brands
          WHERE brand_id = $1
        ) returning true as success;`,
      [brandId, logoObj],
    )
    // this.logger.log(`logoObj resp -> ${JSON.stringify(resp)}`)
    if (resp.success) { return logoObj }
  }

  async transloaditEncoder(
    filePath: string,
    brandId: BrandEntity['brandId'],
  ): Promise<TransloaditEncodeResponse> {

    // strip file path
    let fileName = filePath.replace(/^.*[\\\/]/, '')
    // strip file extention from fileName
    fileName = fileName.replace(/\.[^/.]+$/, '')
    // this.logger.log(`transloaditEncoder - fileName -> ${fileName}`)
    const client = await new TransloaditClient({
      authKey: process.env.TRANSLOADIT_API_KEY,
      authSecret: process.env.TRANSLOADIT_SECRET_KEY,
    })

    const createTransloaditAssembly = templateId => {
      return new Promise((resolve, reject) => {
        const options = {
          waitForCompletion: true,
          params: {
            template_id: templateId,
          },
        }
        client.createAssembly(options, (error, data) => {
          if (error) {
            reject(error)
          }
          resolve(data)
        })
      })
    }

    const createTransloaditTemplate = params => {
      return new Promise((resolve, reject) => {
        client.createTemplate(params, (error, data) => {
          if (error) {
            reject(error)
          }
          resolve(data)
        })
      })
    }

    const template = {
      steps: {
        convert_image_png: {
          use: ':original',
          robot: '/image/resize',
          format: 'png',
          trim_whitespace: true,
        },
        optimize_png: {
          robot: '/image/optimize',
          use: 'convert_image_png',
        },
        store: {
          use: ['optimize_png'],
          robot: '/s3/store',
          bucket: process.env.CLIENT_UPLOADS_BUCKET,
          bucket_region: process.env.AWS_DEFAULT_REGION,
          key: process.env.AWS_ACCESS_KEY_ID,
          secret: process.env.AWS_SECRET_ACCESS_KEY,
          path: `${brandId}/logos/encoded_${fileName}.png`,
        },
      },
    }

    const params = {
      name: 'temporary',
      template,
    }

    return await createTransloaditTemplate(params)
      .then(async (data: TransloaditData) => {
        if (data.ok === 'TEMPLATE_CREATED') {
          const templateId = data.id

          await client.addFile('LogoFile', filePath)
          return await createTransloaditAssembly(templateId).then(
            (result: TransloaditData) => {
              if (result.ok === 'ASSEMBLY_COMPLETED') {
                const encodedUrl = result.results.optimize_png[0].ssl_url
                const width = result.results.optimize_png[0].meta.width
                const height = result.results.optimize_png[0].meta.height
                const aspectRatio = result.results.optimize_png[0].meta.aspect_ratio
                // this.logger.log(`Transloadit results =>  ${JSON.stringify(result.results.optimize_png[0])}`)
                // this.logger.log(`✅ Transloadit Assembly Success`)
                return { encodedUrl, width, height, aspectRatio }
              } else {
                throw new ApolloError(
                  `❌ Unable to process Transloadit Assembly ${
                  result.assembly_id
                  }. ${result.error} ${result.message}`,
                  'TRANSLOADIT_FAILED',
                )
              }
            },
          )
        }
      })
      .catch(err => {
        throw new ApolloError(
          'Transloadit failed while encoding logo',
          'TRANSLOADIT_FAILED',
          err,
        )
      })
  }

  // uses the ritekit api to pull a logo image from a url
  async scrapeLogo(
    websiteUrl: BrandEntity['websiteUrl'],
    brandId: BrandEntity['brandId'],
  ): Promise<LogoObject> {
    const writeFileAsync = promisify(fs.writeFile)
    const unlinkAsync = promisify(fs.unlink)

    const { logosTmpDir } = await mkTmpDir(brandId)
    const fileName = `${brandId}_${Date.now()}.png`
    const tempFilePath = `${logosTmpDir}/${fileName}`

    const originalUrl = await this.httpService
      .get(
        `${process.env.RITEKIT_URL}?domain=${websiteUrl}&client_id=${
        process.env.RITEKIT_API_KEY
        }`,
        {
          responseType: 'arraybuffer',
        },
      )
      .toPromise()
      .then(async response => {
        const buff = Buffer.from(response.data, 'base64')
        await writeFileAsync(tempFilePath, buff, {
          encoding: 'base64',
        })
        // Upload original image to s3
        const origUrl = await s3Uploader(tempFilePath)
          .catch(err => {
            this.logger.error(err)
            throw new ApolloError('scrapeLogo s3Uploader failed', 'RITEKIT_LOGO_UPLOAD_FAILED', err)
          })
        return origUrl
      })
      .catch(err => {
        this.logger.error(err)
        throw new ApolloError('scrapeLogo failed', 'RITEKIT_FAILED', err)
      })

    // Encode with transloadit and uploads to s3
    const { encodedUrl, width, height, aspectRatio } = await this.transloaditEncoder(tempFilePath, brandId)
    // this.logger.log(`encodeLogo -> encodedUrl -> ${JSON.stringify(encodedUrl)}`)
    // Delete temp file upload
    unlinkAsync(tempFilePath)

    const logoObj = {
      _id: await uuidv4(),
      originalUrl,
      encodedUrl,
      encodedSize: {
        width,
        height,
        aspectRatio,
      },
    }
    // this.logger.log(
    //   `scrapeLogo Service -> logoObj -> ${JSON.stringify(logoObj)}`,
    // )
    return logoObj
  }
}
