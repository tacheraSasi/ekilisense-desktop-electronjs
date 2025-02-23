const { dialog } = require('electron');
const EkiliRelay = require('ekilirelay');
const os = require('os');

class BugReporter {
  constructor(apiKey) {
    this.mailer = new EkiliRelay(apiKey);
    this.defaultRecipient = 'support@ekilie.com';
  }

  async sendBugReport(mainWindow) {
    const { response, checkboxChecked } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Send Report', 'Cancel'],
      title: 'Report Bug',
      message: 'Submit bug report to ekiliSense support?',
      detail: 'Would you like to include your contact information?',
      checkboxLabel: 'Include my email address'
    });

    if (response === 0) {
      const { value: description } = await dialog.showMessageBox({
        type: 'input',
        title: 'Bug Description',
        message: 'Please describe the issue:',
        buttons: ['Submit', 'Cancel'],
        normalizeAccessKeys: true
      });

      if (description) {
        const systemInfo = this.getSystemInfo();
        const userEmail = checkboxChecked ? `${os.userInfo().username}@ekilie.com` : 'anonymous';
        
        const emailContent = `
          Bug Report:
          ${description}
          
          System Info:
          ${systemInfo}
        `;

        try {
          const response = await this.mailer.sendEmail(
            this.defaultRecipient,
            `Bug Report from ${userEmail}`,
            emailContent,
            `From: ${userEmail}`
          );

          dialog.showMessageBox({
            type: response.status === 'success' ? 'info' : 'error',
            title: 'Bug Report Status',
            message: response.status === 'success' 
              ? 'Thank you for your report!'
              : 'Failed to send bug report'
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
    }
  }

  getSystemInfo() {
    return `
      Platform: ${os.platform()}
      Arch: ${os.arch()}
      OS Version: ${os.version()}
      Electron Version: ${process.versions.electron}
      Chrome Version: ${process.versions.chrome}
      Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}GB Total
    `;
  }
}

module.exports = BugReporter;