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

const {describe, test, expect, jest, afterAll} = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');

const C = require('../../Common/sources/constants');
const formatChecker = require('../../Common/sources/formatchecker');
const documentFormats = require('../../Common/sources/documentFormats');

const UNKNOWN = C.AVS_OFFICESTUDIO_FILE_UNKNOWN;

function makeCtx() {
  return {logger: {warn: jest.fn(), error: jest.fn(), debug: jest.fn(), info: jest.fn()}};
}

function bufferWith(length, bytes) {
  const buf = Buffer.alloc(length);
  for (const [pos, value] of Object.entries(bytes)) {
    buf[Number(pos)] = value;
  }
  return buf;
}

describe('formatchecker extension <-> format', () => {
  // canonical extension -> format id, each must round trip unchanged
  const canonical = {
    docx: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOCX,
    doc: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOC,
    odt: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_ODT,
    rtf: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_RTF,
    txt: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_TXT,
    xml: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_XML,
    html: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_HTML,
    mht: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_MHT,
    epub: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_EPUB,
    fb2: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_FB2,
    mobi: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_MOBI,
    docm: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOCM,
    dotx: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOTX,
    dotm: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOTM,
    fodt: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_ODT_FLAT,
    ott: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_OTT,
    oform: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_OFORM,
    docxf: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOCXF,
    pages: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_PAGES,
    hwp: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_HWP,
    hwpx: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_HWPX,
    hwpml: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_HWPML,
    md: C.AVS_OFFICESTUDIO_FILE_DOCUMENT_MD,
    pptx: C.AVS_OFFICESTUDIO_FILE_PRESENTATION_PPTX,
    ppt: C.AVS_OFFICESTUDIO_FILE_PRESENTATION_PPT,
    odp: C.AVS_OFFICESTUDIO_FILE_PRESENTATION_ODP,
    ppsx: C.AVS_OFFICESTUDIO_FILE_PRESENTATION_PPSX,
    pptm: C.AVS_OFFICESTUDIO_FILE_PRESENTATION_PPTM,
    ppsm: C.AVS_OFFICESTUDIO_FILE_PRESENTATION_PPSM,
    potx: C.AVS_OFFICESTUDIO_FILE_PRESENTATION_POTX,
    potm: C.AVS_OFFICESTUDIO_FILE_PRESENTATION_POTM,
    fodp: C.AVS_OFFICESTUDIO_FILE_PRESENTATION_ODP_FLAT,
    otp: C.AVS_OFFICESTUDIO_FILE_PRESENTATION_OTP,
    odg: C.AVS_OFFICESTUDIO_FILE_PRESENTATION_ODG,
    key: C.AVS_OFFICESTUDIO_FILE_PRESENTATION_KEY,
    xlsx: C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLSX,
    xls: C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLS,
    ods: C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_ODS,
    csv: C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_CSV,
    xlsm: C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLSM,
    xltx: C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLTX,
    xltm: C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLTM,
    xlsb: C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLSB,
    fods: C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_ODS_FLAT,
    ots: C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_OTS,
    numbers: C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_NUMBERS,
    jpg: C.AVS_OFFICESTUDIO_FILE_IMAGE_JPG,
    tiff: C.AVS_OFFICESTUDIO_FILE_IMAGE_TIFF,
    tga: C.AVS_OFFICESTUDIO_FILE_IMAGE_TGA,
    gif: C.AVS_OFFICESTUDIO_FILE_IMAGE_GIF,
    png: C.AVS_OFFICESTUDIO_FILE_IMAGE_PNG,
    emf: C.AVS_OFFICESTUDIO_FILE_IMAGE_EMF,
    wmf: C.AVS_OFFICESTUDIO_FILE_IMAGE_WMF,
    bmp: C.AVS_OFFICESTUDIO_FILE_IMAGE_BMP,
    cr2: C.AVS_OFFICESTUDIO_FILE_IMAGE_CR2,
    pcx: C.AVS_OFFICESTUDIO_FILE_IMAGE_PCX,
    ras: C.AVS_OFFICESTUDIO_FILE_IMAGE_RAS,
    psd: C.AVS_OFFICESTUDIO_FILE_IMAGE_PSD,
    ico: C.AVS_OFFICESTUDIO_FILE_IMAGE_ICO,
    pdf: C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_PDF,
    swf: C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_SWF,
    djvu: C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_DJVU,
    xps: C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_XPS,
    svg: C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_SVG,
    htmlr: C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_HTMLR,
    ofd: C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_OFD,
    doct: C.AVS_OFFICESTUDIO_FILE_TEAMLAB_DOCY,
    xlst: C.AVS_OFFICESTUDIO_FILE_TEAMLAB_XLSY,
    pptt: C.AVS_OFFICESTUDIO_FILE_TEAMLAB_PPTY,
    ooxml: C.AVS_OFFICESTUDIO_FILE_OTHER_OOXML,
    odf: C.AVS_OFFICESTUDIO_FILE_OTHER_ODF,
    vsdx: C.AVS_OFFICESTUDIO_FILE_DRAW_VSDX,
    vssx: C.AVS_OFFICESTUDIO_FILE_DRAW_VSSX,
    vstx: C.AVS_OFFICESTUDIO_FILE_DRAW_VSTX,
    vsdm: C.AVS_OFFICESTUDIO_FILE_DRAW_VSDM,
    vssm: C.AVS_OFFICESTUDIO_FILE_DRAW_VSSM,
    vstm: C.AVS_OFFICESTUDIO_FILE_DRAW_VSTM
  };

  test.each(Object.entries(canonical))('round trip %s', (ext, format) => {
    expect(formatChecker.getFormatFromString(ext)).toBe(format);
    expect(formatChecker.getStringFromFormat(format)).toBe(ext);
  });

  test('canonical table has distinct, defined format ids', () => {
    const ids = Object.values(canonical);
    expect(ids).not.toContain(undefined);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // aliases map to a format whose canonical extension differs
  test.each([
    ['wps', 'doc'],
    ['xslt', 'txt'],
    ['htm', 'html'],
    ['mhtml', 'mht'],
    ['dps', 'ppt'],
    ['et', 'xls'],
    ['tsv', 'csv'],
    ['jpeg', 'jpg'],
    ['jpe', 'jpg'],
    ['tif', 'tiff']
  ])('alias %s resolves like %s', (alias, canonicalExt) => {
    expect(formatChecker.getFormatFromString(alias)).toBe(canonical[canonicalExt]);
    expect(formatChecker.getStringFromFormat(formatChecker.getFormatFromString(alias))).toBe(canonicalExt);
  });

  test('pdfa has its own id but is written back as pdf', () => {
    expect(formatChecker.getFormatFromString('pdfa')).toBe(C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_PDFA);
    expect(formatChecker.getFormatFromString('pdfa')).not.toBe(C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_PDF);
    expect(formatChecker.getStringFromFormat(C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_PDFA)).toBe('pdf');
  });

  test('getFormatFromString is case insensitive', () => {
    expect(formatChecker.getFormatFromString('DOCX')).toBe(C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOCX);
    expect(formatChecker.getFormatFromString('XlSx')).toBe(C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLSX);
  });

  test('getFormatFromString returns UNKNOWN for unknown, empty and missing input', () => {
    expect(formatChecker.getFormatFromString('nope')).toBe(UNKNOWN);
    expect(formatChecker.getFormatFromString('')).toBe(UNKNOWN);
    expect(formatChecker.getFormatFromString(undefined)).toBe(UNKNOWN);
    expect(formatChecker.getFormatFromString(null)).toBe(UNKNOWN);
  });

  test('getFormatFromString does not trim or strip a leading dot', () => {
    expect(formatChecker.getFormatFromString('.docx')).toBe(UNKNOWN);
    expect(formatChecker.getFormatFromString(' docx')).toBe(UNKNOWN);
  });

  test('getFormatFromString throws on a non-string truthy value', () => {
    expect(() => formatChecker.getFormatFromString(123)).toThrow(TypeError);
  });

  test('getStringFromFormat returns empty string for unknown ids', () => {
    expect(formatChecker.getStringFromFormat(UNKNOWN)).toBe('');
    expect(formatChecker.getStringFromFormat(-1)).toBe('');
    expect(formatChecker.getStringFromFormat(undefined)).toBe('');
  });

  test.each([
    ['DOCUMENT_DOC_FLAT', C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOC_FLAT, 'doc'],
    ['DOCUMENT_DOCX_FLAT', C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOCX_FLAT, 'docx'],
    ['DOCUMENT_HTML_IN_CONTAINER', C.AVS_OFFICESTUDIO_FILE_DOCUMENT_HTML_IN_CONTAINER, 'doc'],
    ['DOCUMENT_DOCX_PACKAGE', C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOCX_PACKAGE, 'xml'],
    ['DOCUMENT_OFORM_PDF', C.AVS_OFFICESTUDIO_FILE_DOCUMENT_OFORM_PDF, 'pdf'],
    ['PRESENTATION_PPTX_PACKAGE', C.AVS_OFFICESTUDIO_FILE_PRESENTATION_PPTX_PACKAGE, 'xml'],
    ['SPREADSHEET_XLSX_FLAT', C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLSX_FLAT, 'xlsx'],
    ['SPREADSHEET_XLSX_PACKAGE', C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLSX_PACKAGE, 'xml'],
    ['OTHER_HTMLZIP', C.AVS_OFFICESTUDIO_FILE_OTHER_HTMLZIP, 'zip'],
    ['OTHER_JSON', C.AVS_OFFICESTUDIO_FILE_OTHER_JSON, 'json'],
    ['IMAGE', C.AVS_OFFICESTUDIO_FILE_IMAGE, 'zip'],
    ['CANVAS_WORD', C.AVS_OFFICESTUDIO_FILE_CANVAS_WORD, 'bin'],
    ['CANVAS_SPREADSHEET', C.AVS_OFFICESTUDIO_FILE_CANVAS_SPREADSHEET, 'bin'],
    ['CANVAS_PRESENTATION', C.AVS_OFFICESTUDIO_FILE_CANVAS_PRESENTATION, 'bin'],
    ['CANVAS_PDF', C.AVS_OFFICESTUDIO_FILE_CANVAS_PDF, 'bin'],
    ['CANVAS_DRAW', C.AVS_OFFICESTUDIO_FILE_CANVAS_DRAW, 'bin'],
    ['OTHER_OLD_DOCUMENT', C.AVS_OFFICESTUDIO_FILE_OTHER_OLD_DOCUMENT, 'doct'],
    ['OTHER_OLD_PRESENTATION', C.AVS_OFFICESTUDIO_FILE_OTHER_OLD_PRESENTATION, 'pptt'],
    ['OTHER_OLD_DRAWING', C.AVS_OFFICESTUDIO_FILE_OTHER_OLD_DRAWING, 'pptt'],
    ['TEAMLAB_VSDY', C.AVS_OFFICESTUDIO_FILE_TEAMLAB_VSDY, 'vsdt']
  ])('getStringFromFormat one-way id %s', (_name, format, ext) => {
    expect(format).not.toBeUndefined();
    expect(formatChecker.getStringFromFormat(format)).toBe(ext);
  });

  test('vsdt has no reverse mapping', () => {
    expect(formatChecker.getFormatFromString('vsdt')).toBe(UNKNOWN);
  });
});

describe('formatchecker format classification', () => {
  const D = C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOCX;
  const S = C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLSX;
  const P = C.AVS_OFFICESTUDIO_FILE_PRESENTATION_PPTX;

  // [label, format, isDoc, isSheet, isPres, isOOX, isBrowserEditor]
  const table = [
    ['docx', D, true, false, false, true, false],
    ['doc', C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOC, true, false, false, false, false],
    ['odt', C.AVS_OFFICESTUDIO_FILE_DOCUMENT_ODT, true, false, false, false, false],
    ['docm', C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOCM, true, false, false, true, false],
    ['dotx', C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOTX, true, false, false, true, false],
    ['oform', C.AVS_OFFICESTUDIO_FILE_DOCUMENT_OFORM, true, false, false, true, false],
    ['docxf', C.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOCXF, true, false, false, true, false],
    ['oform-pdf', C.AVS_OFFICESTUDIO_FILE_DOCUMENT_OFORM_PDF, true, false, false, true, false],
    ['xlsx', S, false, true, false, true, false],
    ['xls', C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLS, false, true, false, false, false],
    ['csv', C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_CSV, false, true, false, false, false],
    ['xlsm', C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLSM, false, true, false, true, false],
    ['xltx', C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLTX, false, true, false, true, false],
    ['xltm', C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLTM, false, true, false, true, false],
    ['xlsb', C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLSB, false, true, false, false, false],
    ['pptx', P, false, false, true, true, false],
    ['ppt', C.AVS_OFFICESTUDIO_FILE_PRESENTATION_PPT, false, false, true, false, false],
    ['ppsx', C.AVS_OFFICESTUDIO_FILE_PRESENTATION_PPSX, false, false, true, true, false],
    ['potm', C.AVS_OFFICESTUDIO_FILE_PRESENTATION_POTM, false, false, true, true, false],
    ['odp', C.AVS_OFFICESTUDIO_FILE_PRESENTATION_ODP, false, false, true, false, false],
    ['pdf', C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_PDF, false, false, false, false, true],
    ['pdfa', C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_PDFA, false, false, false, false, true],
    ['djvu', C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_DJVU, false, false, false, false, true],
    ['xps', C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_XPS, false, false, false, false, true],
    ['svg', C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_SVG, false, false, false, false, false],
    ['png', C.AVS_OFFICESTUDIO_FILE_IMAGE_PNG, false, false, false, false, false],
    ['canvas word', C.AVS_OFFICESTUDIO_FILE_CANVAS_WORD, true, false, false, false, false],
    ['canvas sheet', C.AVS_OFFICESTUDIO_FILE_CANVAS_SPREADSHEET, false, true, false, false, false],
    ['canvas pres', C.AVS_OFFICESTUDIO_FILE_CANVAS_PRESENTATION, false, false, true, false, false],
    ['docy', C.AVS_OFFICESTUDIO_FILE_TEAMLAB_DOCY, true, false, false, false, false],
    ['xlsy', C.AVS_OFFICESTUDIO_FILE_TEAMLAB_XLSY, false, true, false, false, false],
    ['ppty', C.AVS_OFFICESTUDIO_FILE_TEAMLAB_PPTY, false, false, true, false, false],
    ['unknown', UNKNOWN, false, false, false, false, false]
  ];

  test.each(table)('%s', (_label, format, isDoc, isSheet, isPres, isOOX, isBrowser) => {
    expect(formatChecker.isDocumentFormat(format)).toBe(isDoc);
    expect(formatChecker.isSpreadsheetFormat(format)).toBe(isSheet);
    expect(formatChecker.isPresentationFormat(format)).toBe(isPres);
    expect(formatChecker.isOOXFormat(format)).toBe(isOOX);
    expect(formatChecker.isBrowserEditorFormat(format)).toBe(isBrowser);
  });

  test('predicates return false for undefined', () => {
    expect(formatChecker.isDocumentFormat(undefined)).toBe(false);
    expect(formatChecker.isOOXFormat(undefined)).toBe(false);
    expect(formatChecker.isBrowserEditorFormat(undefined)).toBe(false);
  });
});

describe('formatchecker signature detection', () => {
  describe('getImageFormat', () => {
    const ctx = makeCtx();
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);

    test.each([
      ['jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), C.AVS_OFFICESTUDIO_FILE_IMAGE_JPG],
      ['png', png, C.AVS_OFFICESTUDIO_FILE_IMAGE_PNG],
      ['gif87a', Buffer.from('GIF87a'), C.AVS_OFFICESTUDIO_FILE_IMAGE_GIF],
      ['gif89a', Buffer.from('GIF89a'), C.AVS_OFFICESTUDIO_FILE_IMAGE_GIF],
      ['gif8 only', Buffer.from('GIF8'), C.AVS_OFFICESTUDIO_FILE_IMAGE_GIF],
      ['bmp', bufferWith(34, {0: 0x42, 1: 0x4d, 26: 0x01, 28: 0x18}), C.AVS_OFFICESTUDIO_FILE_IMAGE_BMP],
      ['tiff little endian', Buffer.from([0x49, 0x49, 0x2a, 0x00]), C.AVS_OFFICESTUDIO_FILE_IMAGE_TIFF],
      ['tiff big endian', Buffer.from([0x4d, 0x4d, 0x00, 0x2a]), C.AVS_OFFICESTUDIO_FILE_IMAGE_TIFF],
      ['cr2', Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x10, 0x00, 0x00, 0x00, 0x43, 0x52]), C.AVS_OFFICESTUDIO_FILE_IMAGE_CR2],
      ['wmf placeable', Buffer.from([0xd7, 0xcd, 0xc6, 0x9a, 0x00, 0x00]), C.AVS_OFFICESTUDIO_FILE_IMAGE_WMF],
      ['wmf win3', Buffer.from([0x01, 0x00, 0x09, 0x00, 0x00, 0x03]), C.AVS_OFFICESTUDIO_FILE_IMAGE_WMF],
      ['emf', bufferWith(44, {0: 0x01, 40: 0x20, 41: 0x45, 42: 0x4d, 43: 0x46}), C.AVS_OFFICESTUDIO_FILE_IMAGE_EMF],
      ['pcx', Buffer.from([0x0a, 0x05, 0x01, 0x08]), C.AVS_OFFICESTUDIO_FILE_IMAGE_PCX],
      ['tga', bufferWith(17, {1: 0x00, 2: 0x02, 16: 0x18}), C.AVS_OFFICESTUDIO_FILE_IMAGE_TGA],
      ['ras', Buffer.from([0x59, 0xa6, 0x6a, 0x95]), C.AVS_OFFICESTUDIO_FILE_IMAGE_RAS],
      ['psd', bufferWith(13, {0: 0x38, 1: 0x42, 2: 0x50, 3: 0x53, 5: 0x01}), C.AVS_OFFICESTUDIO_FILE_IMAGE_PSD],
      ['ico', Buffer.from([0x00, 0x00, 0x01, 0x00]), C.AVS_OFFICESTUDIO_FILE_IMAGE_ICO],
      ['svg', Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'), C.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_SVG]
    ])('%s', (_label, buffer, expected) => {
      expect(formatChecker.getImageFormat(ctx, buffer)).toBe(expected);
    });

    test('empty and unrecognised buffers are UNKNOWN', () => {
      expect(formatChecker.getImageFormat(ctx, Buffer.alloc(0))).toBe(UNKNOWN);
      expect(formatChecker.getImageFormat(ctx, Buffer.from('hello world'))).toBe(UNKNOWN);
      expect(formatChecker.getImageFormat(ctx, Buffer.from('%PDF-1.7'))).toBe(UNKNOWN);
      expect(ctx.logger.error).not.toHaveBeenCalled();
    });

    test('truncated signatures are not detected', () => {
      expect(formatChecker.getImageFormat(ctx, png.subarray(0, 15))).toBe(UNKNOWN);
      expect(formatChecker.getImageFormat(ctx, Buffer.from([0xff, 0xd8]))).toBe(UNKNOWN);
      expect(formatChecker.getImageFormat(ctx, Buffer.from('GIF'))).toBe(UNKNOWN);
      expect(formatChecker.getImageFormat(ctx, bufferWith(33, {0: 0x42, 1: 0x4d, 26: 0x01, 28: 0x18}))).toBe(UNKNOWN);
    });

    test('svg marker is only searched in the first 1000 bytes', () => {
      const late = Buffer.concat([Buffer.alloc(1000, 0x20), Buffer.from('<svg/>')]);
      expect(formatChecker.getImageFormat(ctx, late)).toBe(UNKNOWN);
    });

    test('invalid input is caught, logged and reported as UNKNOWN', () => {
      const errCtx = makeCtx();
      expect(formatChecker.getImageFormat(errCtx, null)).toBe(UNKNOWN);
      expect(errCtx.logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDocumentFormatBySignature', () => {
    test.each([
      ['DOCY', C.AVS_OFFICESTUDIO_FILE_CANVAS_WORD],
      ['XLSY', C.AVS_OFFICESTUDIO_FILE_CANVAS_SPREADSHEET],
      ['PPTY', C.AVS_OFFICESTUDIO_FILE_CANVAS_PRESENTATION],
      ['DOCY;v5;1234;', C.AVS_OFFICESTUDIO_FILE_CANVAS_WORD]
    ])('%s', (text, expected) => {
      expect(formatChecker.getDocumentFormatBySignature(Buffer.from(text))).toBe(expected);
    });

    test('unknown, truncated and empty input', () => {
      expect(formatChecker.getDocumentFormatBySignature(Buffer.from('DOC'))).toBe(UNKNOWN);
      expect(formatChecker.getDocumentFormatBySignature(Buffer.from('docy'))).toBe(UNKNOWN);
      expect(formatChecker.getDocumentFormatBySignature(Buffer.alloc(0))).toBe(UNKNOWN);
      expect(formatChecker.getDocumentFormatBySignature(null)).toBe(UNKNOWN);
      expect(formatChecker.getDocumentFormatBySignature(undefined)).toBe(UNKNOWN);
    });

    test('PDF magic is not detected by content', () => {
      expect(formatChecker.getDocumentFormatBySignature(Buffer.from('%PDF-1.7\n'))).toBe(UNKNOWN);
    });

    test('ZIP magic is not detected by this function', () => {
      expect(formatChecker.getDocumentFormatBySignature(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(UNKNOWN);
    });
  });

  describe('getOfficeZipFormatBySignature', () => {
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const marker = Buffer.from('xl/workbook.xml');

    test('xlsx is detected by xl/workbook.xml', () => {
      const buf = Buffer.concat([zipHeader, Buffer.alloc(20), marker, Buffer.alloc(20)]);
      expect(formatChecker.getOfficeZipFormatBySignature(buf)).toBe(C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLSX);
    });

    test('ZIP header variants 05 04 and 07 04 are accepted, 01 04 is not', () => {
      for (const variant of [0x05, 0x07]) {
        const buf = Buffer.concat([Buffer.from([0x50, 0x4b, variant, 0x04]), marker]);
        expect(formatChecker.getOfficeZipFormatBySignature(buf)).toBe(C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLSX);
      }
      const bad = Buffer.concat([Buffer.from([0x50, 0x4b, 0x01, 0x04]), marker]);
      expect(formatChecker.getOfficeZipFormatBySignature(bad)).toBe(UNKNOWN);
    });

    test('docx and pptx archives are not detected (only xlsx is)', () => {
      const docx = Buffer.concat([zipHeader, Buffer.from('word/document.xml')]);
      const pptx = Buffer.concat([zipHeader, Buffer.from('ppt/presentation.xml')]);
      expect(formatChecker.getOfficeZipFormatBySignature(docx)).toBe(UNKNOWN);
      expect(formatChecker.getOfficeZipFormatBySignature(pptx)).toBe(UNKNOWN);
    });

    test('marker is only searched in the last 8KB', () => {
      const tooFar = Buffer.concat([zipHeader, marker, Buffer.alloc(9000)]);
      expect(formatChecker.getOfficeZipFormatBySignature(tooFar)).toBe(UNKNOWN);
      const near = Buffer.concat([zipHeader, Buffer.alloc(9000), marker]);
      expect(formatChecker.getOfficeZipFormatBySignature(near)).toBe(C.AVS_OFFICESTUDIO_FILE_SPREADSHEET_XLSX);
    });

    test('non-zip, empty and truncated buffers are UNKNOWN', () => {
      expect(formatChecker.getOfficeZipFormatBySignature(marker)).toBe(UNKNOWN);
      expect(formatChecker.getOfficeZipFormatBySignature(Buffer.from('%PDF-1.7'))).toBe(UNKNOWN);
      expect(formatChecker.getOfficeZipFormatBySignature(Buffer.alloc(0))).toBe(UNKNOWN);
      expect(formatChecker.getOfficeZipFormatBySignature(Buffer.from([0x50, 0x4b, 0x03]))).toBe(UNKNOWN);
    });

    test('null input throws TypeError (no guard, unlike getDocumentFormatBySignature)', () => {
      expect(() => formatChecker.getOfficeZipFormatBySignature(null)).toThrow(TypeError);
    });
  });

  describe('getDocumentFormatByFile', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'formatchecker-'));
    afterAll(() => {
      fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    test('reads the first bytes of a file', async () => {
      const file = path.join(tmpDir, 'a.bin');
      fs.writeFileSync(file, Buffer.concat([Buffer.from('XLSY'), Buffer.alloc(500)]));
      await expect(formatChecker.getDocumentFormatByFile(file)).resolves.toBe(C.AVS_OFFICESTUDIO_FILE_CANVAS_SPREADSHEET);
    });

    test('empty and unrecognised files are UNKNOWN', async () => {
      const empty = path.join(tmpDir, 'empty.bin');
      fs.writeFileSync(empty, '');
      await expect(formatChecker.getDocumentFormatByFile(empty)).resolves.toBe(UNKNOWN);
      const other = path.join(tmpDir, 'other.bin');
      fs.writeFileSync(other, 'plain text');
      await expect(formatChecker.getDocumentFormatByFile(other)).resolves.toBe(UNKNOWN);
    });

    test('missing file rejects', async () => {
      await expect(formatChecker.getDocumentFormatByFile(path.join(tmpDir, 'missing.bin'))).rejects.toThrow(/ENOENT/);
    });
  });
});

describe('documentFormats.getAllFormats', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'documentformats-'));
  const categories = [
    'pdfView',
    'pdfEdit',
    'wordView',
    'wordEdit',
    'cellView',
    'cellEdit',
    'slideView',
    'slideEdit',
    'diagramView',
    'diagramEdit',
    'forms'
  ];
  afterAll(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  function writeJson(name, content) {
    const file = path.join(tmpDir, name);
    fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
    return file;
  }

  const allEmpty = result => Object.values(result).every(list => list.length === 0);

  test('exports only getAllFormats', () => {
    expect(Object.keys(documentFormats)).toEqual(['getAllFormats']);
  });

  test('classifies formats by type and actions', async () => {
    const file = writeJson('formats.json', [
      {name: 'docx', type: 'word', actions: ['view', 'edit']},
      {name: 'doc', type: 'word', actions: ['view', 'lossy-edit']},
      {name: 'rtf', type: 'word', actions: ['view']},
      {name: 'xlsx', type: 'cell', actions: ['edit']},
      {name: 'xls', type: 'cell', actions: ['view']},
      {name: 'pptx', type: 'slide', actions: ['view', 'edit']},
      {name: 'odp', type: 'slide', actions: ['view']},
      {name: 'vsdx', type: 'diagram', actions: ['view']},
      {name: 'pdf', type: 'pdf', actions: ['view', 'edit', 'fill']},
      {name: 'djvu', type: 'pdf', actions: ['view']}
    ]);
    const ctx = makeCtx();
    const result = await documentFormats.getAllFormats(file, ctx);
    expect(Object.keys(result)).toEqual(categories);
    expect(result.wordEdit).toEqual(['docx', 'doc']);
    expect(result.wordView).toEqual(['rtf']);
    expect(result.cellEdit).toEqual(['xlsx']);
    expect(result.cellView).toEqual(['xls']);
    expect(result.slideEdit).toEqual(['pptx']);
    expect(result.slideView).toEqual(['odp']);
    expect(result.diagramView).toEqual(['vsdx']);
    expect(result.diagramEdit).toEqual([]);
    expect(result.pdfEdit).toEqual(['pdf']);
    expect(result.pdfView).toEqual(['djvu']);
    expect(result.forms).toEqual(['pdf']);
    expect(ctx.logger.warn).not.toHaveBeenCalled();
  });

  test('skips malformed entries and unknown types', async () => {
    const file = writeJson('malformed.json', [
      {type: 'word', actions: ['view']},
      {name: 'x', actions: ['view']},
      {name: 'y', type: 'word'},
      {name: 'z', type: 'word', actions: 'view'},
      {name: 'unk', type: 'other', actions: ['view']},
      {name: 'noact', type: 'word', actions: []},
      {name: 'ok', type: 'word', actions: ['view']}
    ]);
    const result = await documentFormats.getAllFormats(file, makeCtx());
    expect(result.wordView).toEqual(['ok']);
    for (const key of categories.filter(k => k !== 'wordView')) {
      expect(result[key]).toEqual([]);
    }
  });

  test('result is cached per file path', async () => {
    const file = writeJson('cached.json', [{name: 'docx', type: 'word', actions: ['edit']}]);
    const first = await documentFormats.getAllFormats(file, makeCtx());
    fs.writeFileSync(file, JSON.stringify([{name: 'odt', type: 'word', actions: ['edit']}]));
    const second = await documentFormats.getAllFormats(file, makeCtx());
    expect(second).toBe(first);
    expect(second.wordEdit).toEqual(['docx']);
    const other = writeJson('cached-other.json', [{name: 'odt', type: 'word', actions: ['edit']}]);
    const third = await documentFormats.getAllFormats(other, makeCtx());
    expect(third.wordEdit).toEqual(['odt']);
  });

  test('missing file path returns empty categories with a warning and is not cached', async () => {
    const ctx = makeCtx();
    const result = await documentFormats.getAllFormats('', ctx);
    expect(Object.keys(result)).toEqual(categories);
    expect(allEmpty(result)).toBe(true);
    expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
    const again = await documentFormats.getAllFormats('', ctx);
    expect(again).not.toBe(result);
  });

  test('missing file path without a context rejects with TypeError', async () => {
    await expect(documentFormats.getAllFormats('')).rejects.toThrow(TypeError);
  });

  test('unreadable file returns empty categories, warns and is retried later', async () => {
    const file = path.join(tmpDir, 'late.json');
    const ctx = makeCtx();
    const empty = await documentFormats.getAllFormats(file, ctx);
    expect(allEmpty(empty)).toBe(true);
    expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
    writeJson('late.json', [{name: 'docx', type: 'word', actions: ['edit']}]);
    const loaded = await documentFormats.getAllFormats(file, ctx);
    expect(loaded.wordEdit).toEqual(['docx']);
  });

  test('invalid JSON is handled like an unreadable file', async () => {
    const ctx = makeCtx();
    const result = await documentFormats.getAllFormats(writeJson('bad.json', '{not json'), ctx);
    expect(allEmpty(result)).toBe(true);
    expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
  });

  test('non-array JSON returns empty categories with a warning and is not cached', async () => {
    const ctx = makeCtx();
    const file = writeJson('object.json', {name: 'docx'});
    const result = await documentFormats.getAllFormats(file, ctx);
    expect(allEmpty(result)).toBe(true);
    expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
    const again = await documentFormats.getAllFormats(file, ctx);
    expect(again).not.toBe(result);
  });
});
