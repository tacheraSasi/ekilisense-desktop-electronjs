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
        title: 'Submit System Report',
        message: 'Send anonymous system report to ekiliSense support?',
        detail: 'Technical details about your system will be included to help diagnose potential issues.'
      });

      if (response !== 0) return;

      // system information
      const systemInfo = this.getSystemInfo();
      const emailContent = `
        === System Information ===
        ${systemInfo}
      `;

      // Send report
      await sender(
        this.defaultRecipient,
        'System Report - ekiliSense Desktop',
        emailContent,
        'ekiliSense Desktop Bug Report <tachera@ekilie.com>',
        this.apiKey
      );

      // Success feedback
      dialog.showMessageBox({
        type: 'info',
        title: 'Report Submitted',
        message: 'Thank you for your contribution!',
        detail: 'Your system report has been successfully submitted.',
        buttons: ['OK']
      });

    } catch (error) {
        console.log(error);
      dialog.showMessageBox({
        type: 'error',
        title: 'Submission Failed',
        message: 'Could not send system report',
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