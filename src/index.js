const hideBrowser = false;

const readline = require('readline');
const arrayTxt = require('./utils/ArrayTxt');
const browserGomsa = require('./utils/Browser');
const gomsa = new browserGomsa(hideBrowser);

const fileTxtPO = 'po.txt';
const pathDownload = 'download';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});

async function consult() {
    return new Promise((resolve, reject) => {
        rl.question('Consulta: ', (consult) => {
            const data = consult.toUpperCase();
            console.clear();
            if (data === "M") {
                rl.close();

                console.log('Realizando consulta masiva, espere por favor... \n');

                const dataPO = new arrayTxt(fileTxtPO);

                resolve(dataPO.PO());
            } else if (data === "U") {
                rl.question('Ingresa la PO a descargar: ', po => {
                    rl.close();
                    resolve([po]);
                });
            }
            else {
                setTimeout(() => {
                    console.clear();
                    reject(new Error('Consulta invalida, intente de nuevo'));
                }, 1000);
            }
        });
    });
}

async function getData(dataPO, page, path) {
    return new Promise(async (resolve, reject) => {
        for (const po of dataPO) {
            console.log(`Realizando Consulta de PO ${po}`);
            await gomsa.getDownloads(page, path, po)
                .then(msj => {
                    console.log(`\x1b[92m${msj}\x1b[0m`);
                })
                .catch(err => {
                    console.log(`\x1b[91m${err.message}\x1b[0m`);
                });
        }
        await page.browser().close();
        resolve('Consultas Finalizadas');
    });
}

async function init() {

    console.log(`Tipo de consulta:\nM - Masivo\nU - Unico`);
    const dataPO = await consult()
        .then(data => (data))
        .catch(err => {
            console.log(`\x1b[91m${err.message}\x1b[0m`);
            process.exit(1);
        });

    const page = await gomsa.getAccess()
        .then(data => (data))
        .catch(err => {
            console.log(`\x1b[91m${err.message}\x1b[0m`);
            process.exit(1);
        });

    await getData(dataPO, page, pathDownload)
        .then(msj => console.log(`\x1b[92m${msj}\x1b[0m`))
        .catch(err => {
            console.log(`\x1b[91m${err.message}\x1b[0m`);
            process.exit(1);
        });

}


init()
.catch(err => {
    console.log(`\x1b[91m${err.message}\x1b[0m`);
    process.exit(1);
});
