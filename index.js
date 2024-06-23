if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const axios = require('axios')
const basicAuth = require('basic-auth')
const bodyParser = require('body-parser')
const cors = require('cors');
const https = require('https');

const io = require('socket.io-client')
const socket = io("https://live669-0bac3349fa62.herokuapp.com")

const {printBill, posPayment, reports, inAndOut, printNefiscal} = require('./print/printFiscal')
const {printOrders} = require('./print/printOrders')

const {sendToPrint} = require('./connectToPrinter')

const auth = (req, res, next) => {
    const user = basicAuth(req);
    const validUsername = process.env.API_USER
    const validPassword = process.env.API_PASSWORD
    console.log(validPassword, validUsername)
    if (user && user.name === validUsername && user.pass === validPassword) {
      return next();
    }
  
    res.set('WWW-Authenticate', 'Basic realm="example"');
    return res.status(401).json({message:'Authentication required.'});
  };



socket.on('connect', () => {
    console.log('Connected to Waiters server');
});


  socket.on('printOrder', async (doc) => {
    try {
        const parsedOrder = JSON.parse(doc)
        const processedDoc = await printOrders(parsedOrder) 
        socket.emit('orderProcessed', processedDoc);
    } catch (error) {
        console.error('Error processing document:', error);
        socket.emit('orderProcessed', { error: 'Failed to process document' });
    }
});

  socket.on('printBill', async (doc) => {
    try {
        const parsedBill = JSON.parse(doc)
        const processedDoc = await printBill(parsedBill) 
        socket.emit('billProcessed', processedDoc);
    } catch (error) {
        console.error('Error processing document:', error);
        socket.emit('billProcessed', { error: 'Failed to process document' });
    }
});


  app.use(bodyParser.json());
  app.use(cors())
  app.use('/print', auth);
  app.use('/orders', auth);



  app.post('/print', async (req, res) => {
    const {fiscal, pos, rep, inOut, nefiscal} = req.body
    try{
        if(fiscal){
            const parsedOrder = JSON.parse(fiscal)
            const response = await printBill(parsedOrder)
            console.log('top print', response)
            return res.status(200).json(response)
        }   
        if(pos){
            const response = await posPayment(pos)
            console.log('top pos', response)
            if(result.data.ReceiptStatus){
               return res.status(200).json({message: 'Plata efectuata cu success!', payment: true})
            } else {
               return res.status(200).json({message: result.data.ErrorInfo, payment: false})
            }
        }  
        if(rep){
            const response = await reports(rep)
            console.log('top reports', response)
            return res.status(200).json(response)
        } 
        if(inOut){
            const response = await inAndOut(inOut.mode, inOut.sum)
            console.log('top inOut', response)
            return  res.status(200).json(response)
        }
        if(nefiscal){
            const parsedOrder = JSON.parse(nefiscal)
            const response = await printNefiscal(parsedOrder)
            console.log('top nefiscal', response)
            return  res.status(200).json(response)
        }
    } catch(error){
        res.status(500).json(error)
    }
  });


  app.post('/orders', async (req, res) => {
    const {order} = req.body
    if(order){
        const parsedOrder = JSON.parse(order)
        // console.log(parsedOrder)
        try{
            const response = await printOrders(parsedOrder)
            console.log(response)
            if(response){
                res.status(200).json(response)
            }
        } catch(error){
            console.log('an error ocured 1')
            res.status(500).json(error)
        }
    } else {
        res.status(404).json({message: 'Comanda nu a ajuns!'})
    }
  })


  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

  async function makeRequestWithRetry(url, expectedCondition, retries, delayTime) {
    const agent = new https.Agent({
        rejectUnauthorized: false
      });
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await axios.get(url, {headers: {'Content-Type': 'application/json'},httpsAgent: agent});
            if (expectedCondition(response)) {
                return response;
            }
            console.log(`Attempt ${attempt + 1} failed, retrying...`);
        } catch (error) {
            console.error(`Attempt ${attempt + 1} encountered an error:`, error);
        }
        await delay(delayTime);
    }
    throw new Error(`Failed to get the expected response after ${retries} attempts`);
  }
  
  
  
  
 app.get('/pos2', async (req, res) => {
    const agent = new https.Agent({
        rejectUnauthorized: false
      });
    try{
        const {sessionId, amount, abort, ip, port} = req.query
        if(sessionId && ip && port){
            const baseUrl = `https://${ip}:${port}/pos/v1/`
            if(abort === 'abort'){
                const abortUrl = `${baseUrl}abort`
                axios.post(abortUrl, {"sessionId": `${sessionId}`}, {headers: {'Content-Type': 'application/json'},httpsAgent: agent})
                .then(response => {
                    console.log('Abort succesful', response.data);
                    res.status(200).json(response.data)
                })
                .catch(error => {
                    console.error('Error in the abort process:', error);
                    res.status(500).json(error)
                });
            }else{
                const urlSearchPos = `${baseUrl}sale`
                const urlGetInfo = `${baseUrl}sessions/${sessionId}`
    
                const body = {             
                        "sessionId": `${sessionId}`,
                        "amount": amount*100,
                    }
                    axios.post(urlSearchPos, body, {headers: {'Content-Type': 'application/json'},httpsAgent: agent})
                        .then(response => {
                            console.log('First request successful:', response.data);
                    
                            return delay(3000);
                        })
                        .then(() => {
                            return makeRequestWithRetry(urlGetInfo, 
                                response => response.data.payloadData, 
                                30, 
                                2500
                            );
                        })
                        .then(response => {
                            console.log('Second request successful:', response.data);
                            res.status(200).json(response.data)
                        })
                        .catch(error => {
                            console.error('Error in one of the requests:', error);
                            res.status(500).json(error)
                        });
            }
        } else {
            throw new Error(`Lipsete locatia, login!`);
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({message: err})
    }
  
  })
  

const port = 8081
app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    try{
        await sendToPrint(['TL^ Imprimanta functionala!'])
    } catch(error){
       console.error('Nu se poate conecta la imprimanta!!!!!!')
    }
  });
