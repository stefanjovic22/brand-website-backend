export class ColorEntity {
  colors: ColorObject[]
}

export interface ColorObject {
  _id: string
  hex: string
  hsl?: HslObject
  hsv?: HsvObject
  hwb?: HwbObject
  lab?: LabObject
  rgb?: RgbObject
  cmyk?: CmykObject
  xyz?: XyxObject
  tags?: string[]
  title: string
  selectedColorMode: ColorModeEnum
}

export interface HslObject {
  css: string
  hue: number
  lightness: number
  saturation: number
}

export interface HsvObject {
  css: string
  hue: number
  value: number
  saturation: number
}

export interface HwbObject {
  css: string
  hue: number
  blackness: number
  whiteness: number
}
export interface LabObject {
  css: string
  lightness: number
  a: number
  b: number
}

export interface RgbObject {
  css: string
  red: number
  blue: number
  green: number
}

export interface CmykObject {
  css: string
  cyan: number
  key: number
  yellow: number
  magenta: number
}

export interface XyxObject {
  css: string
  x: number
  y: number
  z: number
}

export enum ColorModeEnum {
  hex = 'hex',
  hsl = 'hsl',
  hsv = 'hsv',
  hwb = 'hwb',
  lab = 'lab',
  rgb = 'rgb',
  xyz = 'xyz',
  cmyk = 'cmyk',
}
