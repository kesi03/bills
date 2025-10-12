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
                    default: new Footer({
                        children: [new Paragraph(
                            {
                                children: [
                                    new TextRun({
                                        text: `${invoice.address.name}`,
                                        bold: true,
                                    }),
                                ],
                            }), new Paragraph(
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
                            }),],
                    }),
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
                        new TableCell({ children: [new Paragraph(item.crn)] }),
                        new TableCell({ children: [new Paragraph(`${moment(item.appointmentDateTime).format('DD-MM-YYYY HH:mm')}`)] }),
                        new TableCell({ children: [new Paragraph(`${DocManager.formatCurrency(item.amount)}`)] }),
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
                                    columnSpan: 3, children: [new Paragraph({
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
                                            text: "CRN",
                                            bold: true,
                                        }),
                                    ],
                                })]
                            }),
                            new TableCell({
                                children: [new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "Date and Time",
                                            bold: true,
                                        }),
                                    ],
                                })]
                            }),
                            new TableCell({
                                children: [new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: "Amount",
                                            bold: true,
                                        }),
                                    ],
                                })]
                            }),
                        ],
                        tableHeader: true,
                    }),
                    ...rows,
                    new TableRow({
                        children: [
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
            console.log('Invoice generated successfully!');
        });
    }
}
