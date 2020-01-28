export class LogoEntity {
  logos: LogoObject[]
}

export interface LogoObject {
  _id: string
  title?: string
  tags?: string[]
  originalUrl: string
  encodedUrl: string
  encodedSize?: EncodedLogoSizeObject
  spacing?: LogoSpacingObject
}

export interface EncodedLogoSizeObject {
  width?: number
  height?: number
  aspectRatio?: string
}

export interface LogoSpacingObject {
  isEditedByUser?: boolean
  topPercentage?: number
  bottomPercentage?: number
  leftPercentage?: number
  rightPercentage?: number
  spacingMultiple?: number
}

export interface TransloaditData {
  ok?: string
  id?: string
  assembly_id?: string
  error?: string
  message?: string
  results?: {
    optimize_png: TransloaditDataResults[],
  }
}

export interface TransloaditDataResults {
  ssl_url: string
  meta: {
    width: number
    height: number
    aspect_ratio: string,
  }
}

export interface TransloaditEncodeResponse {
  encodedUrl: string
  width: number
  height: number
  aspectRatio: string,
}
