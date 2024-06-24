
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
                tva = 3
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
        if(bill.voucher > 0) {
            billToPrint.push("ST^")
            let voucherLine = `DV^${bill.voucher * 100}`
            billToPrint.push(voucherLine)
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
        if(bill.payment.viva) {
            let cardLine = `P^7^${bill.payment.viva * 100}`
            billToPrint.push(cardLine)
        }
        if(bill.payment.online) {
            let onlineLine = `P^7^${bill.payment.online * 100}`
            billToPrint.push(onlineLine)
        }
        try {
            if(bill.total > 0) {
                console.log('hit before print function')
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



async function printNefiscal(bill) {
    let data = [
        `TL^           NOTA DE PLATA NEFISCALA    `,
        "TL^ ", 
        `TL^SE ELIBEREAZA CA NOTA INFORMATIVA`,
        "TL^", 
    ];
    if(bill.products.length){
        for(let pro of bill.products){
            let entry = `TL^  ${pro.name} --- ${pro.price} X ${pro.quantity} === ${pro.total} Lei`
            data.push(entry)
        }
        console.log(bill)
        let totalProductsLine = `TL^ Total Produse    ${bill.total + bill.discount + bill.cashBack} Lei`
        data.push(totalProductsLine)
        let discountLine = `TL^ Discount    ${bill.discount} Lei`
        data.push(discountLine)
        let totalLine = `TL^ TOTAL        ${bill.total} Lei`
        let thanks = `TL^MULTUMIM SI VA MAI ASTEPTAM!`
        data.push(totalLine)
        try {
            const response = await sendToPrint(data)
            if(response){
                console.log(response.data)
                return {message: 'Nota de plata a fost tiparita'}
            } 
      } catch (error) {
            console.log('nefiscal error')
            throw error
      }
    } else {
        return
    }
}




async function posPayment(sum){
    let posLine = [`POS^${sum * 100}`]
    try {
        const response = await sendToPrint(posLine, 20000)
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



module.exports = {printBill, posPayment, reports, inAndOut, printNefiscal}

