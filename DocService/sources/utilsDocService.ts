/*
 * (c) Copyright Ascensio System SIA 2010-2024
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

'use strict';

// TypeScript source. Only erasable syntax is allowed (tsconfig.json: erasableSyntaxOnly):
// `node ts-strip.js` erases the types and writes utilsDocService.js next to this file.
// CommonJS stays as it was (require / module.exports) so the exports shape is unchanged.

type SharpModule = typeof import('sharp');
type SharpPipeline = import('sharp').Sharp;

interface Logger {
  debug(format: string, ...args: unknown[]): void;
  warn(format: string, ...args: unknown[]): void;
  error(format: string, ...args: unknown[]): void;
}

interface NotificationTemplate {
  title: string;
  body: string;
}

/** The subset of operationContext used here. */
interface OperationContext {
  logger: Logger;
  getCfg<T>(property: string, defaultValue: T): T;
}

/** The image metadata fields read by determineOptimalFormat (a subset of sharp's Metadata). */
interface FormatHints {
  hasAlpha?: boolean;
  width?: number;
  height?: number;
}

type ImageFormat = 'png' | 'jpeg';

interface DecodedHeic {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

interface NotificationServiceModule {
  notificationTypes: {LICENSE_EXPIRATION_WARNING: string; LICENSE_EXPIRATION_ERROR: string};
  notify(ctx: OperationContext, notificationType: string, title: string, message: string): Promise<unknown>;
}

const os: typeof import('os') = require('os');
const util: typeof import('util') = require('util');
const config: {get<T>(setting: string): T} = require('config');
const locale: Record<string, {id: number} | undefined> = require('windows-locale');
const ms: (value: string) => number = require('ms');
const decodeHeic: (options: {buffer: Buffer}) => Promise<DecodedHeic> = require('heic-decode');
const operationContext: {global: OperationContext} = require('./../../Common/sources/operationContext');

function initializeSharp(): void {
  let originalValues: Record<string, string | undefined> = {};
  try {
    const tmp = os.tmpdir();
    // Save original values
    originalValues = {
      XDG_CACHE_HOME: process.env.XDG_CACHE_HOME,
      HOME: process.env.HOME
    };
    // Set temporary values for Sharp initialization
    process.env.XDG_CACHE_HOME = tmp;
    process.env.HOME = tmp;

    sharp = require('sharp');
  } catch (error) {
    operationContext.global.logger.warn('Sharp module failed to load. Image processing functionality will be limited.');
    operationContext.global.logger.warn('Sharp load error:', (error as Error).message);
  } finally {
    // Restore original values
    Object.keys(originalValues).forEach(key => {
      if (originalValues[key] !== undefined) {
        process.env[key] = originalValues[key];
      } else {
        delete process.env[key];
      }
    });
  }

  if (sharp) {
    // todo test.
    // Set concurrency to 2 for better performance
    sharp.concurrency(2);
    // Disable cache - not needed for one-time image conversion (writes to ./.cache dir)
    sharp.cache(false);
  }
}

// Load Sharp with graceful fallback for pkg-builds and missing dependencies
let sharp: SharpModule | null = null;
initializeSharp();

const {notificationTypes, ...notificationService}: NotificationServiceModule = require('../../Common/sources/notificationService');

const cfgStartNotifyFrom = ms(config.get<string>('license.warning_license_expiration'));
const cfgNotificationRuleLicenseExpirationWarning = config.get<NotificationTemplate>('notification.rules.licenseExpirationWarning.template');
const cfgNotificationRuleLicenseExpirationError = config.get<NotificationTemplate>('notification.rules.licenseExpirationError.template');

/**
 * Determine optimal format (PNG vs JPEG) for image conversion based on image characteristics.
 * @param ctx Operation context for logging
 * @param metadata Image metadata from sharp
 * @returns Optimal format for conversion
 */
function determineOptimalFormat(ctx: OperationContext, metadata: FormatHints): ImageFormat {
  // If image has alpha channel, only PNG can preserve transparency
  if (metadata.hasAlpha) {
    return 'png';
  }

  // Analyze color characteristics
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Small images (likely icons/logos) - prefer PNG
  // Only apply when dimensions are known (greater than zero)
  if (width > 0 && height > 0 && width <= 256 && height <= 256) {
    return 'png';
  }

  // Large photographic images - prefer JPEG
  if (width > 800 || height > 600) {
    return 'jpeg';
  }

  // Default to JPEG for general compatibility and smaller file sizes
  return 'jpeg';
}

/**
 * Convert Sharp pipeline to buffer in optimal format (PNG or JPEG).
 * @param pipeline Sharp pipeline instance
 * @param format Target format ('png' or 'jpeg')
 * @returns Converted image buffer
 */
async function convertToFormat(pipeline: SharpPipeline, format: ImageFormat): Promise<Buffer> {
  if (format === 'png') {
    return await pipeline.png({compressionLevel: 7}).toBuffer();
  }
  return await pipeline.jpeg({quality: 90, chromaSubsampling: '4:4:4'}).toBuffer();
}

/**
 * Decode HEIC/HEIF buffer using heic-decode library and create Sharp instance.
 * @param sharpLib The loaded sharp module
 * @param buffer HEIC/HEIF image buffer
 * @returns Sharp instance with decoded raw image data
 */
async function decodeHeicToSharp(sharpLib: SharpModule, buffer: Buffer): Promise<SharpPipeline> {
  const decodedImage = await decodeHeic({buffer});
  return sharpLib(decodedImage.data, {
    failOn: 'none',
    raw: {
      width: decodedImage.width,
      height: decodedImage.height,
      channels: 4
    }
  });
}

/**
 * Process and optimize image buffer with EXIF rotation fix and modern format conversion.
 * 1. Fixes EXIF rotation and strips metadata for all images
 * 2. Converts modern/unsupported formats to optimal formats:
 *    - WebP/HEIC/HEIF/AVIF/TIFF: Convert to optimal format (PNG or JPEG) based on image characteristics
 * @param ctx Operation context for logging
 * @param buffer Source image bytes
 * @returns Processed and optimally converted buffer or original buffer
 */
async function processImageOptimal(ctx: OperationContext, buffer: Buffer | null | undefined): Promise<Buffer | null | undefined> {
  if (!buffer) return buffer;

  // Check if Sharp is available
  if (!sharp) {
    ctx.logger.warn('processImageOptimal: Sharp module not available, returning original buffer. Image processing disabled.');
    return buffer;
  }
  const sharpLib = sharp;

  try {
    const meta = await sharpLib(buffer, {failOn: 'none'}).metadata();
    const fmt: string = (meta.format || '').toLowerCase();
    const needsRotation = meta.orientation && meta.orientation > 1;

    // Handle modern formats requiring conversion
    if (fmt === 'heic' || fmt === 'heif' || fmt === 'webp' || fmt === 'avif' || fmt === 'tiff' || fmt === 'tif') {
      const optimalFormat = determineOptimalFormat(ctx, meta);
      ctx.logger.debug('processImageOptimal: converting %s to %s%s', fmt, optimalFormat, needsRotation ? ' with rotation' : '');

      try {
        const pipeline = sharpLib(buffer, {failOn: 'none'}).rotate();
        return await convertToFormat(pipeline, optimalFormat);
      } catch (sharpError) {
        // Fallback to heic-decode for HEIC/HEIF when Sharp fails
        if (fmt === 'heic' || fmt === 'heif') {
          ctx.logger.debug('processImageOptimal: Sharp failed for %s, using heic-decode fallback', fmt);
          const heicPipeline = await decodeHeicToSharp(sharpLib, buffer);
          return await convertToFormat(heicPipeline, optimalFormat);
        }
        throw sharpError;
      }
    }

    // For standard formats, only apply EXIF rotation if needed
    if (needsRotation) {
      ctx.logger.debug('processImageOptimal: applying EXIF rotation to %s', fmt);
      const pipeline = sharpLib(buffer, {failOn: 'none'}).rotate();

      if (fmt === 'jpeg' || fmt === 'jpg') {
        return await pipeline.jpeg({quality: 90, chromaSubsampling: '4:4:4'}).toBuffer();
      }
      if (fmt === 'png') {
        return await pipeline.png({compressionLevel: 7}).toBuffer();
      }
      return await pipeline.toBuffer();
    }
  } catch (e) {
    ctx.logger.debug('processImageOptimal error: %s', (e as Error).stack);
  }

  return buffer;
}

/**
 * Map a language tag (e.g. 'en-US') to its Windows LCID.
 * @param lang Language tag
 * @returns The LCID, or undefined when the tag is unknown
 */
function localeToLCID(lang: string | null | undefined): number | undefined {
  const elem = lang ? locale[lang.toLowerCase()] : undefined;
  return elem && elem.id;
}

function humanFriendlyExpirationTime(endTime: Date): string {
  const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return `${month[endTime.getUTCMonth()]} ${endTime.getUTCDate()}, ${endTime.getUTCFullYear()}`;
}

/**
 * Notify server user about license expiration via configured notification transports.
 * @param ctx Context.
 * @param endDate Date of expiration.
 */
async function notifyLicenseExpiration(ctx: OperationContext, endDate: Date | null | undefined): Promise<void> {
  if (!endDate) {
    ctx.logger.warn('notifyLicenseExpiration(): expiration date is not defined');
    return;
  }

  const currentDate = new Date();
  if (currentDate.getTime() >= endDate.getTime() - cfgStartNotifyFrom) {
    //todo remove stub for "new Date(1)" and "setMonth + 1" in license.js; bug 70676
    if (endDate.getUTCFullYear() < 2000) {
      endDate = currentDate;
    }
    const formattedExpirationTime = humanFriendlyExpirationTime(endDate);
    const applicationName = (process.env.APPLICATION_NAME || '').toUpperCase();
    if (endDate <= currentDate) {
      const tenNotificationRuleLicenseExpirationError = ctx.getCfg(
        'notification.rules.licenseExpirationError.template',
        cfgNotificationRuleLicenseExpirationError
      );
      const title = util.format(tenNotificationRuleLicenseExpirationError.title, applicationName);
      const message = util.format(tenNotificationRuleLicenseExpirationError.body, formattedExpirationTime);
      ctx.logger.error(message);
      await notificationService.notify(ctx, notificationTypes.LICENSE_EXPIRATION_ERROR, title, message);
    } else {
      const tenNotificationRuleLicenseExpirationWarning = ctx.getCfg(
        'notification.rules.licenseExpirationWarning.template',
        cfgNotificationRuleLicenseExpirationWarning
      );
      const title = util.format(tenNotificationRuleLicenseExpirationWarning.title, applicationName);
      const message = util.format(tenNotificationRuleLicenseExpirationWarning.body, formattedExpirationTime);
      ctx.logger.warn(message);
      await notificationService.notify(ctx, notificationTypes.LICENSE_EXPIRATION_WARNING, title, message);
    }
  }
}

module.exports.processImageOptimal = processImageOptimal;
module.exports.determineOptimalFormat = determineOptimalFormat;
module.exports.localeToLCID = localeToLCID;
module.exports.notifyLicenseExpiration = notifyLicenseExpiration;
