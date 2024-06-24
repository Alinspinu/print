
const {sendToPrint} = require('../connectToPrinter')

async function printBill(bill) {   
    let billToPrint = [];
    if(bill){
        if(bill.cif){
            let cifLine = `CF^${bill.cif}`
            billToPrint.push(cifLine)
        }
        bill.products.forEach(el => {
            let tva 
            let qty
            if(el.tva === 19){
                tva = 1
            }
            if(el.tva === 9){
                tva = 2
            }
            if(el.tva === 5){
                tva = 4
            }
            if(el.tva === 0){
                tva = 5
            }
            if(el.quantity === 0){
                qty = 1
            } else {
                qty = el.quantity
            }
            let productPrice = el.price
            if(el.sgrTax) {
                productPrice -= 0.5
            }
            let productLine = `S^${el.name}^${productPrice*100}^${qty*1000}^buc^${tva}^1`
            billToPrint.push(productLine)

            if(el.toppings.length){
                el.toppings.forEach(top => {
                    if(!top.name.startsWith('To Go') && top.name !== 'Taxa SGR'){
                        let topLine = `TL^    +${top.name}`
                        billToPrint.push(topLine)
                    }
                    if(top.name === "Taxa SGR"){
                        let sgrLine = `S^Taxa SGR^50^${qty*1000}^buc^3^2`
                        billToPrint.push(sgrLine)
                    }
                })
            }   
        })
        if(bill.tips > 0){
            let tipsLine = `S^Tips^${bill.tips * 100}^1000^buc^3^2`
            billToPrint.push(tipsLine)
        }
        if(bill.discount > 0){
            billToPrint.push("ST^")
            let discountLine = `DV^${bill.discount * 100}`
            billToPrint.push(discountLine)
        }
        if(bill.cashBack > 0){
            billToPrint.push("ST^")
            let discountLine = `DV^${bill.cashBack * 100}`
            billToPrint.push(discountLine)
        }
        billToPrint.push("ST^")
        if(bill.payment.card){
            let cardLine = `P^2^${bill.payment.card * 100}`
            billToPrint.push(cardLine)
        }
        if(bill.payment.cash) {
            let cashLine = `P^1^${bill.payment.cash * 100}`
            billToPrint.push(cashLine)
        }
        if(bill.payment.online) {
            let onlineLine = `P^3^${bill.payment.online * 100}`
            billToPrint.push(onlineLine)
        }
        try {
            if(bill.total > 0 && !bill.dont) {
                const response = await sendToPrint(billToPrint)
                if(response){
                    return {message: 'Bonul fiscal a fost tiparit!'}
                }
            } else{
                return {message: 'Nota de plata a fost salvată!'}
            }
      } catch (error) {
            throw error
      }
    } else {
        return
    }
}



async function posPayment(sum){
    let posLine = [`POS^${sum * 100}`]
    try {
        const response = await sendToPrint(posLine, 30000)
        if(response){
            console.log(response.data)
            return response.data
        } 
    } catch (error){
        console.error('POS  error occurred');
        throw error
    }
}


async function reports(report){
    let reportLine = []
    if(report === 'x'){``
        let xLine = `X^`
        reportLine.push(xLine)
    }
    if(report === 'z'){
        let zLine = `Z^`
        reportLine.push(zLine)
    }
    console.log(reportLine)
    let message = report === 'x' ? `Raportul X a fost printat!` : `Raportul Z a fost printat!`

    try {
        const response = await sendToPrint(reportLine)
        if(response){
            return {message: message}
        } 
    } catch (error){
        console.error('Reports error occurred');
        throw error
    }
}


async function inAndOut(mode, sum){
    let inAndOutLine = []
    if(mode === 'in'){
        let inLine = `I^${sum * 100}`;
        inAndOutLine.push(inLine);
    }
    if(mode === 'out') {
        let outLine = `O^${sum * 100}`;
        inAndOutLine.push(outLine)
    }
    let message = mode === 'in' ? `${sum} de lei au fost adăugați în casă!` : `${sum} de lei au fost scoși din casă!`
    try {
        const response = await sendToPrint(inAndOutLine)
        if(response){
            return {message: message}
        } 
    } catch (error){
        console.error('InOrOut error occurred', error);
        throw error
    }
}



module.exports = {printBill, posPayment, reports, inAndOut}

