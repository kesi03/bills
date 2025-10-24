import Handlebars from "handlebars";
import * as fs from 'fs-extra';
import { resolve } from "path";
import logger from '../../logs';


export default class HtmlExportManager{
    public static async export(payload:Object){
        const templateSource = await fs.readFile(resolve('./template/table.hbs'), 'utf-8');
        const template = Handlebars.compile(templateSource);
        const html = template(payload);
        logger.info(html)
    }
}