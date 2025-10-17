import ExcelJS from 'exceljs';

export namespace Styles {
     export const name: Partial<ExcelJS.Style> = {
    font: {
      bold: true,
      size: 18,
      color: { argb: "FF000000" },
      name: "Calibri",
      family: 2
    },
    border: {},
    fill: {
      type: "pattern",
      pattern: "none"
    },
    alignment: {
      horizontal: "right"
    }
  };
  export const bold: Partial<ExcelJS.Style> = {
    font: {
      bold: true,
      size: 12,
      color: { argb: "FF000000" },
      name: "Calibri",
      family: 2
    },
    border: {},
    fill: {
      type: "pattern",
      pattern: "none"
    },
    alignment: {
      horizontal: "right"
    }
  };

  export const normal: Partial<ExcelJS.Style> = {
    font: {
      bold: false,
      size: 12,
      color: { argb: "FF000000" },
      name: "Calibri",
      family: 2
    },
    border: {},
    fill: {
      type: "pattern",
      pattern: "none"
    },
    alignment: {
      horizontal: "left"
    }
  };

  export const tableHeader: Partial<ExcelJS.Style> = {
    font: {
      bold: true,
      size: 12,
      color: { argb: "FFffffff" },
      name: "Calibri",
      family: 2
    },
    border: {
      left: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
      top: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } }
    },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF000000" }
    },
    alignment: {
      horizontal: "left",
      wrapText: true
    }
  };
}