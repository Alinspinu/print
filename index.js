if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const axios = require('axios')
const basicAuth = require('basic-auth')
const bodyParser = require('body-parser')
const cors = require('cors');


const {printBill, posPayment, reports, inAndOut} = require('./print/printFiscal')

const auth = (req, res, next) => {
    const user = basicAuth(req);
    const validUsername = process.env.API_CAFETISH_USER
    const validPassword = process.env.API_PASSWORD
    
    if (user && user.name === validUsername && user.pass === validPassword) {
      return next();
    }
  
    res.set('WWW-Authenticate', 'Basic realm="example"');
    return res.status(401).json({message:'Authentication required.'});
  };


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




  app.post('/print', async (req, res) => {
    const {fiscal, pos, rep, inOut} = req.body
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
    } catch(error){
        res.status(500).json(error)
    }
  });
    

const port = 8081
app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
  });
