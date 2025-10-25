import fs from 'fs';
import inquirer from 'inquirer';
import logs from '../logs';


export function hasEmptyValues(obj: Record<string, any>): boolean {
  return Object.values(obj).some(
    (value) => value === '' || value === null || value === undefined
  );
}


export async function promptWithRetry<T>(configPath: string, questions: any[], key: string): Promise<void> {
    const config: any = fs.existsSync(configPath)
        ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
        : {};
    while (true) {
        try {
            const answers = await inquirer.prompt(questions);
            config[key] = answers;
            if (!config['Assessment Type']) {
                config['Assessment Type'] = {
                    "Full Needs Assessment": "assessment",
                    "Funded Review (New Condition)": "review"
                }
            }

            if (!config['Cancelled']) {
                config['Cancelled'] = true
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            logs.info(`✅ Saved ${key} to config.json`);
            break;
        } catch (err:any) {
            if(err.name==='ExitPromptError'){
                logs.info('\n❌ Cancelled by user.');
                process.exit(0);
            }
            else{
                console.error(`❌ Error in ${key}:`, err);
                logs.info(JSON.stringify(err,null,2))
                logs.info('🔁 Let’s try again...');
            }
        }
    }
}