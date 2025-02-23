const { dialog } = require('electron');
const os = require('os');
const { sender } = require('./emailSender');

class BugReporter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.defaultRecipient = 'support@ekilie.com';
  }

  async sendBugReport(mainWindow) {
    try {
      const { response, checkboxChecked } = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Send Report', 'Cancel'],
        title: 'Report Bug',
        message: 'Submit bug report to ekiliSense support?',
        detail: 'Would you like to include your contact information?',
        checkboxLabel: 'Include my email address'
      });

      if (response !== 0) return;

      const { value: description } = await dialog.showMessageBox({
        type: 'input',
        title: 'Bug Description',
        message: 'Please describe the issue:',
        buttons: ['Submit', 'Cancel']
      });

      if (!description) return;

      const systemInfo = this.getSystemInfo();
      const userEmail = checkboxChecked ? `${os.userInfo().username}@ekilie.com` : 'anonymous';
      
      await sender(
        this.defaultRecipient,
        `Bug Report from ${userEmail}`,
        `Bug Report:\n${description}\n\nSystem Info:\n${systemInfo}`,
        `From: ${userEmail}`,
        this.apiKey
      );

      dialog.showMessageBox({
        type: 'info',
        title: 'Bug Report Status',
        message: 'Thank you for your report!'
      });

    } catch (error) {
      dialog.showMessageBox({
        type: 'error',
        title: 'Error',
        message: 'Failed to send bug report',
        detail: error.message
      });
    }
  }

  getSystemInfo() {
    return [
      `Platform: ${os.platform()}`,
      `Arch: ${os.arch()}`,
      `OS Version: ${os.version()}`,
      `Electron Version: ${process.versions.electron}`,
      `Chrome Version: ${process.versions.chrome}`,
      `Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}GB Total`
    ].join('\n');
  }
}

module.exports = BugReporter;