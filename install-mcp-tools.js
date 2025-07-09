#!/usr/bin/env node

/**
 * MCP Tools Installer for SuperClaude
 * Cross-platform installer for essential MCP tools
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');
const fs = require('fs');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// Tool definitions
const tools = [
  {
    name: 'Context7 (C7)',
    package: '@context7/mcp-server',
    description: 'Official documentation search - Core tool for Research-First policy',
    github: 'https://github.com/context7/mcp-server'
  },
  {
    name: 'Sequential',
    package: '@sequential-thinking/mcp-server',
    description: 'Complex problem decomposition - Primary tool for Analyzer persona',
    github: 'https://github.com/apidog/sequential-thinking'
  },
  {
    name: 'Magic',
    package: '@superclaude/magic-mcp-server',
    description: 'Advanced compression and token optimization',
    github: 'https://github.com/NomenAK/SuperClaude'
  },
  {
    name: 'Puppeteer',
    package: '@puppeteer/mcp-server',
    description: 'Browser automation and web scraping',
    github: 'https://github.com/puppeteer/mcp-server'
  }
];

// Utility functions
const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => {
    console.log(`\n${colors.green}${'='.repeat(40)}${colors.reset}`);
    console.log(`${colors.green}${msg.padStart((40 + msg.length) / 2).padEnd(40)}${colors.reset}`);
    console.log(`${colors.green}${'='.repeat(40)}${colors.reset}\n`);
  }
};

// Check if npm is installed
async function checkNpm() {
  try {
    const { stdout } = await execAsync('npm --version');
    log.success(`npm version ${stdout.trim()} found`);
    return true;
  } catch (error) {
    log.error('npm is not installed. Please install Node.js and npm first.');
    log.info('Download from: https://nodejs.org/');
    return false;
  }
}

// Check if a package is already installed
async function isInstalled(packageName) {
  try {
    await execAsync(`npm list -g ${packageName}`);
    return true;
  } catch {
    return false;
  }
}

// Install a tool
async function installTool(tool) {
  log.info(`Installing ${tool.name}...`);
  console.log(`   ${colors.cyan}Description:${colors.reset} ${tool.description}`);
  console.log(`   ${colors.cyan}GitHub:${colors.reset} ${tool.github}`);
  
  // Check if already installed
  if (await isInstalled(tool.package)) {
    log.success(`${tool.name} is already installed`);
    return { success: true, tool: tool.name };
  }
  
  // Try to install
  try {
    log.warning(`Installing ${tool.package}... (this may take a moment)`);
    const { stdout, stderr } = await execAsync(`npm install -g ${tool.package}`);
    
    if (stderr && !stderr.includes('npm WARN')) {
      throw new Error(stderr);
    }
    
    log.success(`${tool.name} installed successfully`);
    return { success: true, tool: tool.name };
  } catch (error) {
    log.error(`Failed to install ${tool.name}`);
    console.error(`   ${error.message}`);
    return { success: false, tool: tool.name, error: error.message };
  }
}

// Get user confirmation
async function getUserConfirmation() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    readline.question(`\n${colors.yellow}Do you want to proceed with the installation? (Y/n): ${colors.reset}`, (answer) => {
      readline.close();
      resolve(answer.toLowerCase() !== 'n' && answer.toLowerCase() !== 'no');
    });
  });
}

// Show tools to be installed
async function showInstallationPlan() {
  console.log('\nThe following MCP tools will be installed:\n');
  
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    const installed = await isInstalled(tool.package);
    const status = installed ? `${colors.green}[Installed]${colors.reset}` : `${colors.yellow}[To Install]${colors.reset}`;
    
    console.log(`${i + 1}. ${tool.name} ${status}`);
    console.log(`   ${colors.cyan}Package:${colors.reset} ${tool.package}`);
    console.log(`   ${colors.cyan}Purpose:${colors.reset} ${tool.description}\n`);
  }
}

// Main installation process
async function main() {
  log.header('MCP Tools Installer for SuperClaude');
  
  // Check npm
  if (!await checkNpm()) {
    process.exit(1);
  }
  
  // Show installation plan
  await showInstallationPlan();
  
  // Get user confirmation
  const proceed = await getUserConfirmation();
  
  if (!proceed) {
    log.warning('Installation cancelled by user.');
    process.exit(0);
  }
  
  console.log('');
  log.info('Starting installation of MCP tools...\n');
  
  // Install all tools
  const results = [];
  for (const tool of tools) {
    const result = await installTool(tool);
    results.push(result);
    console.log('');
  }
  
  // Summary
  log.header('Installation Summary');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (failed.length === 0) {
    log.success('All MCP tools installed successfully!\n');
    console.log('You can now use these tools in Claude Code:');
    tools.forEach(tool => {
      console.log(`  ${colors.green}•${colors.reset} ${tool.name}: ${tool.description}`);
    });
  } else {
    log.error(`${failed.length} tool(s) failed to install:\n`);
    failed.forEach(result => {
      console.log(`  ${colors.red}•${colors.reset} ${result.tool}`);
    });
    console.log('\nPlease check the error messages above and try again.');
    console.log('You may need to run this installer with administrator privileges.');
    process.exit(1);
  }
  
  console.log(`\n${colors.green}Happy coding with SuperClaude!${colors.reset}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const skipConfirmation = args.includes('-y') || args.includes('--yes');

// Modified main function to handle skip confirmation
async function mainWithArgs() {
  log.header('MCP Tools Installer for SuperClaude');
  
  // Check npm
  if (!await checkNpm()) {
    process.exit(1);
  }
  
  // Show installation plan
  await showInstallationPlan();
  
  // Get user confirmation unless skipped
  if (!skipConfirmation) {
    const proceed = await getUserConfirmation();
    
    if (!proceed) {
      log.warning('Installation cancelled by user.');
      process.exit(0);
    }
  } else {
    log.info('Skipping confirmation (-y flag detected)');
  }
  
  console.log('');
  log.info('Starting installation of MCP tools...\n');
  
  // Install all tools
  const results = [];
  for (const tool of tools) {
    const result = await installTool(tool);
    results.push(result);
    console.log('');
  }
  
  // Summary
  log.header('Installation Summary');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (failed.length === 0) {
    log.success('All MCP tools installed successfully!\n');
    console.log('You can now use these tools in Claude Code:');
    tools.forEach(tool => {
      console.log(`  ${colors.green}•${colors.reset} ${tool.name}: ${tool.description}`);
    });
  } else {
    log.error(`${failed.length} tool(s) failed to install:\n`);
    failed.forEach(result => {
      console.log(`  ${colors.red}•${colors.reset} ${result.tool}`);
    });
    console.log('\nPlease check the error messages above and try again.');
    console.log('You may need to run this installer with administrator privileges.');
    process.exit(1);
  }
  
  console.log(`\n${colors.green}Happy coding with SuperClaude!${colors.reset}`);
}

// Uninstall function
async function uninstall() {
  log.header('MCP Tools Uninstaller for SuperClaude');
  
  console.log('\n⚠️  This will remove SuperClaude MCP tools from ~/.claude/');
  const proceed = await getUserConfirmation('Continue with uninstallation?');
  
  if (!proceed) {
    log.warning('Uninstallation cancelled by user.');
    process.exit(0);
  }
  
  console.log('');
  log.info('Removing SuperClaude MCP tools...');
  
  let removedCount = 0;
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const claudeDir = path.join(homeDir, '.claude');
  
  // Remove CLAUDE.md
  const claudeMd = path.join(claudeDir, 'CLAUDE.md');
  if (fs.existsSync(claudeMd)) {
    console.log('📄 Removing CLAUDE.md...');
    fs.unlinkSync(claudeMd);
    removedCount++;
  }
  
  // Remove commands directory
  const commandsDir = path.join(claudeDir, 'commands');
  if (fs.existsSync(commandsDir)) {
    console.log('📁 Removing commands directory...');
    fs.rmSync(commandsDir, { recursive: true, force: true });
    removedCount++;
  }
  
  // Remove shared directory
  const sharedDir = path.join(claudeDir, 'shared');
  if (fs.existsSync(sharedDir)) {
    console.log('📁 Removing shared directory...');
    fs.rmSync(sharedDir, { recursive: true, force: true });
    removedCount++;
  }
  
  // Check if .claude directory is empty
  if (fs.existsSync(claudeDir)) {
    const items = fs.readdirSync(claudeDir);
    if (items.length === 0) {
      console.log('📁 Removing empty .claude directory...');
      fs.rmdirSync(claudeDir);
      removedCount++;
    } else {
      log.info('Keeping .claude directory (contains other files)');
    }
  }
  
  console.log('');
  if (removedCount > 0) {
    log.success(`Uninstallation complete! Removed ${removedCount} items.`);
  } else {
    log.info('No SuperClaude MCP tools found to uninstall.');
  }
  
  console.log('\n👋 Thank you for using AI-First Context Engineering!');
}

// Show help if requested
if (args.includes('-h') || args.includes('--help')) {
  console.log(`
MCP Tools Installer for SuperClaude

Usage: node install-mcp-tools.js [options]

Options:
  -y, --yes         Skip confirmation prompt and install automatically
  -u, --uninstall   Uninstall SuperClaude MCP tools
  -h, --help        Show this help message

Examples:
  node install-mcp-tools.js          # Interactive installation
  node install-mcp-tools.js -y       # Automatic installation without prompts
  node install-mcp-tools.js -u       # Uninstall MCP tools
`);
  process.exit(0);
}

// Check if uninstall flag is present
if (args.includes('-u') || args.includes('--uninstall')) {
  uninstall().catch(error => {
    log.error('Unexpected error occurred:');
    console.error(error);
    process.exit(1);
  });
} else {
  // Run the installer
  mainWithArgs().catch(error => {
    log.error('Unexpected error occurred:');
    console.error(error);
    process.exit(1);
  });
}