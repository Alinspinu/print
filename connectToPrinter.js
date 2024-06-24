const net = require("net")
const axios = require('axios')
const url = 'http://192.168.1.90:65400/api/Receipt';





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




module.exports = {sendToPrint}