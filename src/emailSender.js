const fetch = require('node-fetch');

function sender(to, subject, message, headers = "", apikey = "") {
  const url = "https://relay.ekilie.com/api/index.php";

  const payload = {
    to,
    subject,
    message,
    headers,
    apikey,
  };

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      return data;
    });
}

module.exports = { sender };