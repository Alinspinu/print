const net = require("net")
const axios = require('axios')
const url = 'http://192.168.1.90:65400/api/Receipt';



const connectToPrinter = (host, port, buffer, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const device = new net.Socket();
    
    // Timeout handling
    const timeoutId = setTimeout(() => {
      device.destroy();
      reject(new PrinterConnectionError('Connection timed out', host, port, timeout));
    }, timeout);

    device.on('close', () => {
      clearTimeout(timeoutId); // Clear timeout on successful connection or close
      if (device) {
        device.destroy();
      }
      resolve(true);
    });

    device.on('error', (err) => {
      clearTimeout(timeoutId); // Clear timeout on error
      if (device) {
        device.destroy();
      }
      reject(new PrinterConnectionError('Connection timed out', host, port, timeout));
    });

    device.connect(port, host, () => {
      console.log('Connected to printer');
      device.write(buffer);
      device.emit('close'); // Simulate close event after writing buffer
    });
  });
};




async function sendToPrint(print, time = 15000){
    try {
        // const response = await axios.post(url, print, {headers: {'Content-Type': 'application/json'}, timeout: time})
        // console.log('response fron bottom', response.request)
        return { message: 'Operatiune efecuata cu success' };
  } catch (error) {
    if (error.response) {
      console.error('Server responded with non-2xx status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    throw error
  }
}





class PrinterConnectionError extends Error {
    constructor(message, host, port, timeout) {
      super(message);
      this.name = 'PrinterBucError';
      this.reason = 'timeout'
      this.host = host;
      this.port = port;
      this.timeout = timeout;
    }
  }





module.exports = {connectToPrinter, sendToPrint}