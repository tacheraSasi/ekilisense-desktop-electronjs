const { dialog } = require('electron');
const os = require('os');
const { sender } = require('./emailSender');

class BugReporter {
  constructor(apiKey) {
    if (!apiKey) throw new Error('Missing API key for bug reporting');
    this.apiKey = apiKey;
    this.defaultRecipient = 'support@ekilie.com';
  }

  async sendBugReport(mainWindow) {
    try {
      // Confirm report submission
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Send Report', 'Cancel'],
        title: 'Submit Bug Report',
        message: 'Send anonymous bug report to ekiliSense support?',
        detail: 'Technical details about your system will be included to help diagnose the issue.'
      });

      if (response !== 0) return;

      // Get bug description with INPUT dialog
      const { response: descResponse, value: description } = await dialog.showMessageBox({
        type: 'input',
        title: 'Bug Description',
        message: 'Please describe the issue you encountered:',
        buttons: ['Submit Report', 'Cancel'],
        cancelId: 1,
        defaultId: 0
      });

      if (descResponse !== 0 || !description || description.trim().length < 10) {
        dialog.showMessageBox({
          type: 'warning',
          title: 'Invalid Input',
          message: 'Please provide a description of at least 10 characters.',
          buttons: ['OK']
        });
        return;
      }

      // Prepare report content
      const systemInfo = this.getSystemInfo();
      const emailContent = `
        === Bug Report ===
        ${description.trim()}
        
        === System Information ===
        ${systemInfo}
      `;

      // Send report
      await sender(
        this.defaultRecipient,
        'Anonymous Bug Report - ekiliSense Desktop',
        emailContent,
        '',
        this.apiKey
      );

      // Success feedback
      dialog.showMessageBox({
        type: 'info',
        title: 'Report Submitted',
        message: 'Thank you for helping improve ekiliSense!',
        detail: 'Your anonymous report has been successfully submitted.',
        buttons: ['OK']
      });

    } catch (error) {
      dialog.showMessageBox({
        type: 'error',
        title: 'Submission Failed',
        message: 'Could not send bug report',
        detail: error.message,
        buttons: ['OK']
      });
    }
  }

  getSystemInfo() {
    return [
      `Platform: ${os.platform()} ${os.arch()}`,
      `OS Version: ${os.version()}`,
      `Electron: ${process.versions.electron}`,
      `Chrome: ${process.versions.chrome}`,
      `Memory: ${(os.totalmem() / 1024 ** 3).toFixed(1)}GB Total`,
      `CPU Cores: ${os.cpus().length}`,
      `Uptime: ${Math.floor(os.uptime() / 60)} minutes`
    ].join('\n');
  }
}

module.exports = BugReporter;