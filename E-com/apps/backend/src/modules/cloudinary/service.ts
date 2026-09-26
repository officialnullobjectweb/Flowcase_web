import type {
  ProviderDeleteFileDTO,
  ProviderFileResultDTO,
  ProviderGetFileDTO,
  ProviderUploadFileDTO,
} from "@medusajs/framework/types"
import {
  AbstractFileProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import { v2 as cloudinary } from "cloudinary"

type Options = {
  cloud_name: string
  api_key: string
  api_secret: string
  folder?: string
  secure?: boolean
}

class CloudinaryFileProviderService extends AbstractFileProviderService {
  static identifier = "cloudinary"
  protected options_: Options

  constructor(_container: unknown, options: Options) {
    super()
    this.options_ = options
    cloudinary.config({
      cloud_name: options.cloud_name,
      api_key: options.api_key,
      api_secret: options.api_secret,
      secure: options.secure ?? true,
    })
  }

  static validateOptions(options: Options) {
    if (!options.cloud_name) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "CLOUDINARY_CLOUD_NAME is required in the file provider options."
      )
    }
    if (!options.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "CLOUDINARY_API_KEY is required in the file provider options."
      )
    }
    if (!options.api_secret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "CLOUDINARY_API_SECRET is required in the file provider options."
      )
    }
  }

  async upload(file: ProviderUploadFileDTO): Promise<ProviderFileResultDTO> {
    const dataUri = `data:${file.mimeType ?? "application/octet-stream"};base64,${file.content}`
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: this.options_.folder,
      resource_type: "auto",
    })
    return {
      url: result.secure_url,
      key: result.public_id,
    }
  }

  async delete(
    files: ProviderDeleteFileDTO | ProviderDeleteFileDTO[]
  ): Promise<void> {
    const list = Array.isArray(files) ? files : [files]
    for (const file of list) {
      await cloudinary.uploader.destroy(file.fileKey, {
        resource_type: "auto",
      })
    }
  }

  async getPresignedDownloadUrl(fileData: ProviderGetFileDTO): Promise<string> {
    return cloudinary.utils.url(fileData.fileKey, {
      secure: this.options_.secure ?? true,
    })
  }

  async getAsBuffer(fileData: ProviderGetFileDTO): Promise<Buffer> {
    const url = await this.getPresignedDownloadUrl(fileData)
    const response = await fetch(url)
    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to fetch file "${fileData.fileKey}" from Cloudinary.`
      )
    }
    return Buffer.from(await response.arrayBuffer())
  }
}

export default CloudinaryFileProviderService
