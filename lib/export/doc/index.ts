import fs from 'fs';
import {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
    WidthType,
    AlignmentType,
    Header,
    Footer,
    ExternalHyperlink,
} from 'docx';
import _ from "lodash"
import { Invoice, InvoiceItemGroup } from '../../../models/invoice';
import moment from 'moment';
import { createFooter } from './footer';
import logger from '../../logs';


export default class DocManager {
    public static createDoc(invoice: Invoice) {
        // Create a new document
        const doc: Document = new Document({
            sections: [{
                headers: {
                    default: new Header({
                        children: [new Paragraph({
                            text: `${invoice.address.name}`,
                            heading: 'Heading2',
                        }),],
                    }),
                },
                footers: {
                    default: createFooter(
                        [new Paragraph(
                            {
                                children: [
                                    new TextRun({
                                        text: `${invoice.address.name}`,
                                        bold: true,
                                    }),
                                ],
                            }),
                        new Paragraph(
                            {
                                children: [
                                    new TextRun({
                                        text: `Epost: `,
                                        bold: true,
                                    }),
                                    new ExternalHyperlink({
                                        children: [
                                            new TextRun({
                                                text: `${invoice.address.epost}`,
                                                style: "Hyperlink",
                                            }),
                                        ],
                                        link: `mailto:${invoice.address.epost}`,
                                    }),
                                ],
                            }),

                        new Paragraph(
                            {
                                children: [
                                    new TextRun({
                                        text: `Address: `,
                                        bold: true,
                                    }),
                                    new TextRun({
                                        text: `${invoice.address.address} , ${invoice.address.postCode} , ${invoice.address.city}`,
                                        bold: false,
                                    }),
                                ],
                            }),
                        ],
                        [// 👉 Right-aligned paragraph
                            new Paragraph({
                            //    alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: "BANK DETAILS:",
                                        bold: true,
                                    }),
                                    new TextRun({
                                        text: ` `,
                                        bold: false,
                                    }),
                                    new TextRun({
                                        text: `${invoice.bank.name}`,
                                        bold: false,
                                    }),
                                ],
                            }),
                            new Paragraph({
                             //   alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: "ACCOUNT NAME:",
                                        bold: true,
                                    }),
                                    new TextRun({
                                        text: ` `,
                                        bold: false,
                                    }),
                                    new TextRun({
                                        text: `${invoice.bank.customer}`,
                                        bold: false,
                                    }),
                                ],
                            }),
                            new Paragraph({
                               // alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: "SORT CODE:",
                                        bold: true,
                                    }),
                                    new TextRun({
                                        text: ` `,
                                        bold: false,
                                    }),
                                    new TextRun({
                                        text: `${invoice.bank.sortCode}`,
                                        bold: false,
                                    }),
                                ],
                            }),
                            new Paragraph({
                              //  alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: "ACCOUNT NUMBER:",
                                        bold: true,
                                    }),
                                    new TextRun({
                                        text: ` `,
                                        bold: false,
                                    }),
                                    new TextRun({
                                        text: `${invoice.bank.account}`,
                                        bold: false,
                                    }),
                                ],
                            }),
                        ]
                    )
                    ,

                },
                children: [
                    new Paragraph({
                        text: 'Invoice',
                        heading: 'Heading1',
                    }),
                    new Paragraph(''),
                    new Paragraph(
                        {
                            children: [
                                new TextRun({
                                    text: `Created Date: `,
                                    bold: true,
                                }),
                                new TextRun({
                                    text: `${moment(new Date()).format('DD-MM-YYYY')}`,
                                    bold: false,
                                }),
                            ],
                        }),
                    new Paragraph(
                        {
                            children: [
                                new TextRun({
                                    text: `Reference: `,
                                    bold: true,
                                }),
                                new TextRun({
                                    text: `${invoice.ref}`,
                                    bold: false,
                                }),
                            ],
                        }),
                    new Paragraph(
                        {
                            children: [
                                new TextRun({
                                    text: `Period: `,
                                    bold: true,
                                }),
                                new TextRun({
                                    text: `${invoice.period}`,
                                    bold: false,
                                }),
                            ],
                        }),
                    new Paragraph(''),
                    DocManager.createTable(invoice.assessments),
                    DocManager.createTable(invoice.reviews),
                    DocManager.createTable(invoice.cancelled),
                    new Paragraph(''),
                    new Paragraph(
                        {
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({
                                    text: `Due: `,
                                    bold: true,
                                }),
                                new TextRun({
                                    text: `${DocManager.formatCurrency(invoice.total)}`,
                                    bold: false,
                                }),
                            ],
                        }),
                ],
            }],
        });
        DocManager.saveDoc(doc, invoice.ref);
    }

    public static formatCurrency(amount: number) {
        const formatted = new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
        }).format(amount);

        return formatted;

    }

    public static createTable(data: InvoiceItemGroup) {
        if (!_.isUndefined(data)) {
            const rows = data.items?.map(item => {
                return new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(item.customer)] }),
                        new TableCell({ children: [new Paragraph(`${moment(item.appointmentDateTime).format('DD-MM-YYYY')}`)] }),
                        new TableCell({ children: [new Paragraph(`${moment(item.completedDateTime).format('DD-MM-YYYY')}`)] }),
                        new TableCell({ children: [new Paragraph(`Remote`)] }),
                        new TableCell({ children: [new Paragraph(`${DocManager.formatCurrency(item.amount)}`)] }),
                        new TableCell({ children: [new Paragraph(`N/A`)] }),
                    ],
                });
            });

            const table = new Table({
                width: {
                    size: 100,
                    type: WidthType.PERCENTAGE,
                },
                rows: [
                    new TableRow(

                        {
                            tableHeader: true,
                            children: [
                                new TableCell({
                                    columnSpan: 6, children: [new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: `${data.title}`,
                                                bold: true,
                                            }),
                                        ],
                                    }),]
                                }),

                            ],
                        }),
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "Student Name",
                                            bold: true,
                                        }),
                                    ],
                                })]
                            }),
                            new TableCell({
                                children: [new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "Appointment Date",
                                            bold: true,
                                        }),
                                    ],
                                })]
                            })
                            ,
                            new TableCell({
                                children: [new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "Report Submission Date",
                                            bold: true,
                                        }),
                                    ],
                                })]
                            }),
                            new TableCell({
                                children: [new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "Assessment Type",
                                            bold: true,
                                        }),
                                    ],
                                })]
                            }),
                            new TableCell({
                                children: [new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "Fee",
                                            bold: true,
                                        }),
                                    ],
                                })]
                            }),
                            new TableCell({
                                children: [new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "VAT",
                                            bold: true,
                                        }),
                                    ],
                                })]
                            })
                        ],
                        tableHeader: true,
                    }),
                    ...rows,
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("")] }),
                            new TableCell({ children: [new Paragraph("")] }),
                            new TableCell({ children: [new Paragraph("")] }),

                            new TableCell({
                                children: [new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "Total",
                                            bold: true,
                                        }),
                                    ],
                                }),]
                            }),
                            new TableCell({
                                children: [new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `${DocManager.formatCurrency(data.amount)}`,
                                            bold: true,
                                        }),
                                    ],
                                }),]
                            }),
                            new TableCell({ children: [new Paragraph("")] }),
                        ],
                    }),
                ],
            });

            return table;
        }
        else {
            return new Paragraph("")
        }
    }

    public static saveDoc(doc: Document, ref: string) {
        // Save the document
        Packer.toBuffer(doc).then((buffer) => {
            fs.writeFileSync(`data/${ref}-invoice.docx`, buffer);
            logger.info('Invoice generated successfully!');
        });
    }
}
