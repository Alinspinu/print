
const ejs = require('ejs');
const fs = require('fs');

const { EscPos } = require("@tillpos/xml-escpos-helper")

const { connectToPrinter, sendToPrint } = require("../connectToPrinter")


const io = require('socket.io-client')
const socket = io("https://live669-0bac3349fa62.herokuapp.com")
// const socket = io("http://localhost:8090")

const templatePath = './print/input.ejs';
const outputPath = './print//output.xml';



async function printOrders(order) {
    console.log(order)
    let foodProd = []
    let mainProd = []
    let baristaProd = []
    let outProducts = []

    const date = new Date(Date.now());
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeString = hours.toString().padStart(2, "0") + ":" + minutes.toString().padStart(2, "0");
    const dataToPrint = {
        inOrOut: order.inOrOut,
        employee: order.employee,
        masa: order.masaRest.index,
        time: timeString,
        products: []
    }
    if(order.out){
        order.products.forEach(el => {
            if(el.sentToPrint){
                if(el.printer === 'kitchen'){
                    foodProd.push(el)
                } else if( el.printer === 'barista' && !el.printOut){
                    baristaProd.push(el)
                } else if(el.printer === 'main'){
                    mainProd.push(el) 
                } else if(el.printOut) {
                    outProducts.push(el)
                    dataToPrint.products.push(el)
                }
            }
        })
    } else {
        order.products.forEach(el => {
            if(el.sentToPrint){
                if(el.printer === 'kitchen'){
                    foodProd.push(el)
                } else if( el.printer === 'barista'){
                    baristaProd.push(el)
                } else if(el.printer === 'main'){
                    mainProd.push(el) 
                }
            }
        })
    }

    if (foodProd.length === 0 && baristaProd.length === 0 && mainProd.length === 0 && outProducts.length === 0) {
        console.log('numar de produse', baristaProd.length);
        return { message: 'Nu sunt comenzi de printat' };
    }

    socket.emit('outsideOrder', JSON.stringify({outProducts, dataToPrint}))
    try{
        if(foodProd.length){
            const bucResponse = await printKitchen(foodProd, dataToPrint);
            if(bucResponse){
                return bucResponse
            }
        }
        if(baristaProd.length){
            const baristaResponse = await printBarista(baristaProd, dataToPrint);
            if(baristaResponse){
                return baristaResponse
            }
        }
        if(mainProd.length){
              const mainResponse = await printMain(mainProd, dataToPrint)
              if(mainResponse){
                return mainResponse
              }
        }
    } catch(error){
        console.log('an error ocured 2')
        throw error
    }
}




async function printKitchen(products, dataPrint) {
    if(products.length){
        let productsToPrint = []
        for(let pro of products){
            const productToPrint = {
                name: pro.name,
                qty: pro.quantity,
                toppings: pro.toppings,
                comment: pro.comment
            }
            productsToPrint.push(productToPrint)
        }
        const dataToPrint = {
            time: dataPrint.time,
            name: dataPrint.employee.fullName,
            inOrOut: dataPrint.inOrOut,
            position: dataPrint.employee.position,
            masa: dataPrint.masa,
            products: productsToPrint
        }

        try{
            const response = await createXml(dataToPrint)
            return response
        } catch(error){
            console.log('error 1')
            throw error
        }
    } else {
        return
    }
}


async function printBarista(products, dataPrint) {   
    console.log('print from barista', products, dataPrint)
    if(products.length){

        let data = [
            `TL^           ORA: ${dataPrint.time}   `,
            "TL^ ", 
            `TL^ NUME:${dataPrint.employee.fullName.split(' ')[0]} MASA: *${dataPrint.masa}*`,
            "TL^ ", 
            `TL^        -=- ${dataPrint.inOrOut} -=-`, 
            "TL^ ",  
        ];
        for(let pro of products){
            let entry = `TL^  ${pro.quantity} X ${pro.name}`
            let line = 'TL^ '
            data.push(entry)
            if(pro.toppings && pro.toppings.length){
                for(let top of pro.toppings){
                    let topp =`TL^          +++ ${top.name.split('/')[0]}`
                    data.push(topp)
                }
            }
            if(pro.comment && pro.comment.length){
                let comment = `TL^       -- ${pro.comment}`
                data.push(comment)
            }
            data.push(line)
        }

        if(dataPrint.products && dataPrint.products.length){
            data.push(`TL^  `)
            data.push(`TL^     -=-  SFARSITUL COMENZII  -=-    `)
            data.push(`TL^   ************************************   `)
            data.push(`TL^  -=- PRODUSE DE RIDICAT DE PE TERASA  -=- `)
            data.push(`TL^  `)
            for(let pro of dataPrint.products){
                let entry = `TL^  ${pro.quantity} X ${pro.name}`
                data.push(entry)
                if(pro.toppings && pro.toppings.length){
                    for(let top of pro.toppings){
                        let topp =`TL^          +++ ${top.name.split('/')[0]}`
                        data.push(topp)
                    }
                }
                if(pro.comment && pro.comment.length){
                    let comment = `TL^       -- ${pro.comment}`
                    data.push(comment)
                }
            }
            data.push(`TL^   ************************************   `)

        }
        try {
            const response = await sendToPrint(data)
            if(response){
                return {message: 'Comanda a fost tiparita!'}
            } 
      } catch (error) {
            console.log('an error ocured 3')
            throw error
      }
    } else {
        return
    }
}


async function printMain(products, dataPrint){
    try{
        const response = await printBarista(products, dataPrint)
        return response
    } catch (err){
        console.log('an error ocured')
        throw err
    }
}




async function createXml(data) {
    return new Promise((resolve, reject) => {
      fs.readFile(templatePath, 'utf-8', (err, templateContent) => {
        if (err) {
          console.error('Error reading EJS template:', err);
          return reject(err); // Reject the promise if readFile encounters an error
        }
  
        const renderedXml = ejs.render(templateContent, data);
  
        fs.writeFile(outputPath, renderedXml, async (writeErr) => {
          if (writeErr) {
            console.error('Error writing XML file:', writeErr);
            return reject(writeErr); // Reject the promise if writeFile encounters an error
          }
          console.log('XML file created successfully.');
          try {
            const response = await testPrint(); // Assuming testPrint() returns a promise
            resolve(response); // Resolve the promise with the response from testPrint()
          } catch (err) {
            console.error('Error printing:', err);
            reject(err); // Reject the promise if testPrint() encounters an error
          }
        });
      });
    });
  }



const testPrint = async () => {
    const template = fs.readFileSync(outputPath, {encoding: "utf8"})
    const PRINTER = {
        device_name: "GTP-180",
        host: "192.168.1.87",
        port: 9100,
}
    const message = EscPos.getBufferFromTemplate(template);

try{
    const response =  await connectToPrinter(PRINTER.host, PRINTER.port, message)
    if(response){
        return {message: 'Comanda a fost tiparita!'}
    }
} catch (err){
    console.log('error 3')
    throw err
}
}


module.exports = {printOrders}