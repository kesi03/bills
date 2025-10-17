import {
  Footer,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  WidthType,
  BorderStyle,
  AlignmentType
} from "docx";

export function createFooter(left: any[], right: any[]): Footer {
  return new Footer({
    children: [
      new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: {
                    size: 55, 
                    type: WidthType.PERCENTAGE,
                },

                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: left,
              }),
              new TableCell({
                width: {
                    size: 45, 
                    type: WidthType.PERCENTAGE, 
                },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: right,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}