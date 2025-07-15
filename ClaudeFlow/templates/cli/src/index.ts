#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

const program = new Command();

program
  .name('{{CLI_COMMAND}}')
  .description('{{PROJECT_DESCRIPTION}}')
  .version('1.0.0');

// Hello コマンド
program
  .command('hello')
  .description('挨拶メッセージを表示')
  .option('-n, --name <name>', '名前を指定', 'World')
  .action((options) => {
    console.log(chalk.green(`🎉 Hello, ${options.name}!`));
    console.log(chalk.blue(`Welcome to {{PROJECT_NAME}} CLI`));
  });

// Interactive コマンド
program
  .command('interactive')
  .description('インタラクティブモード')
  .action(async () => {
    console.log(chalk.yellow('🚀 Interactive mode started'));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'あなたの名前は？',
        default: 'User'
      },
      {
        type: 'list',
        name: 'action',
        message: '何をしますか？',
        choices: [
          'タスクを作成',
          'ファイルを処理',
          '設定を変更',
          '終了'
        ]
      }
    ]);
    
    const spinner = ora('Processing...').start();
    
    // 処理をシミュレート
    setTimeout(() => {
      spinner.succeed(`完了しました！ ${answers.name}さん`);
      console.log(chalk.green(`選択されたアクション: ${answers.action}`));
    }, 2000);
  });

// Status コマンド
program
  .command('status')
  .description('システム状態を表示')
  .action(() => {
    console.log(chalk.cyan('📊 System Status'));
    console.log('───────────────────');
    console.log(`✅ CLI Version: ${program.version()}`);
    console.log(`✅ Node.js Version: ${process.version}`);
    console.log(`✅ Platform: ${process.platform}`);
    console.log(`✅ Working Directory: ${process.cwd()}`);
    console.log(`✅ Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
  });

// エラーハンドリング
program.on('command:*', () => {
  console.error(chalk.red('❌ Invalid command: %s'), program.args.join(' '));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

// ヘルプがない場合はヘルプを表示
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);