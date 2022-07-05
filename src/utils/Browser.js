const puppeteer = require('puppeteer');
const fs = require('fs');
const downloadFiles = require('./Download');
const path = require('path');
require('dotenv').config();

const USER = process.env.USER;
const PASS = process.env.PASS;


module.exports = function (hide) {
    this.data;
    this.hideBrowser = hide;
    this.loginWeb = () => {
        return new Promise(async (resolve, reject) => {
            //Iniciando browser
            const browser = await puppeteer.launch({
                headless: this.hideBrowser
            });

            //Creando nueva pagina
            const page = await browser.newPage();
            await page.setViewport({
                width: 1200,
                height: 720
            });


            await page.goto('https://consultasclientes.gomsa.com/Security/Login?ruta=Home&ruta=Index');
            await page.type('input[name=email]', USER);
            await page.waitForTimeout(2000);
            await page.type('input[name=password]', PASS);
            await page.waitForTimeout(2000);

            await Promise.all([
                page.waitForNavigation({
                    timeout: 20000,
                    waitUntil: 'networkidle2'
                }),
                page.click('form button[type=submit]'),
            ]).then(async ([data]) => {
                const accessGomsa = !/ruta=Error/.test(data._url);

                // console.log(accessGomsa);

                if (accessGomsa) {
                    console.log(`\x1b[92m******* Acceso Correcto *******\x1b[0m`);
                    await page.waitForTimeout(2000);
                    const oldPage = await this.accessOldPage(page);
                    resolve(oldPage);
                } else {
                    reject(new Error('Acceso Incorrecto, verifique sus credenciales'));
                }

            }).catch(async (err) => {
                await browser.close();
                reject(new Error('Acceso Fallido, Intente nuevamente o valide manualmente su acceso'));
            });
        });
    };

    this.accessOldPage = async (page) => {
        // await page.waitForSelector('a[name=link_SIWAnterior]');

        const oldPage = await page.evaluate(() => {
            let link = document.querySelector('a[name=link_SIWAnterior]').getAttribute('href');
            return link;
        });

        await page.waitForTimeout(1000);
        await page.goto(oldPage);
        await page.waitForSelector('#__tab_ctl00_Contenido_tabContenedor_tabResultados');

        await page.waitForSelector('#contenido');
        await page.click('#__tab_ctl00_Contenido_tabContenedor_tabFiltros');
        await page.waitForTimeout(1000);
        await page.click('#ctl00_Contenido_tabContenedor_tabFiltros_rbOperacionesPropias');
        await page.waitForTimeout(2000);
        await page.click('#ctl00_Contenido_tabContenedor_tabFiltros_chkAduanasTodas');
        await page.waitForTimeout(2000);
        await page.click('#ctl00_Contenido_tabContenedor_tabFiltros_chbExportacion');
        await page.waitForTimeout(1500);
        await page.select('#ctl00_Contenido_tabContenedor_tabFiltros_ddlFiltrosVarios', 'PEDIDO');
        await page.waitForTimeout(2000);

        return page;
    };

    this.getAccess = () => {
        return new Promise(async (resolve, reject) => {
            console.log('\nObteniendo acceso a Gomsa ...');
            this.loginWeb()
                .then(async data => {
                    resolve(data);
                })
                .catch(async err => {
                    reject(err);
                });
        });
    };
    this.getDownloads = async (page, pathDownload, downloadPo) => {
        return new Promise(async (resolve, reject) => {
            //Ingresando PO a input
            await page.waitForTimeout(2000);
            await page.click('#__tab_ctl00_Contenido_tabContenedor_tabFiltros');

            await page.evaluate((po) => {
                document.querySelector('#ctl00_Contenido_tabContenedor_tabFiltros_txtFiltrosVarios').value = po;
            }, downloadPo);
            await page.click('#ctl00_Contenido_tabContenedor_tabFiltros_txtFiltrosVarios');
            await page.waitForTimeout(2000);

            await page.click('#ctl00_Contenido_tabContenedor_tabFiltros_btnMostrarConsulta');
            await page.waitForTimeout(3000);

            // Conteo de referencias

            const referencias = await page.evaluate(() => {
                let dataRef = [];
                const tabla = document.querySelector('#ctl00_Contenido_tabContenedor_tabResultados_gvResultados');
                const tabla_filas = tabla.querySelectorAll('tr');

                for (let i = 1; i < tabla_filas.length; i++) {
                    dataRef.push(tabla_filas[i].querySelector('td:nth-child(2) a').id);
                }
                return dataRef;
            });

            if (referencias.length > 0) {
                const downloadFolder = `${pathDownload}/PO${downloadPo}`;

                //Creacion de carpeta de PO
                fs.mkdir(downloadFolder, function (e) {
                    if (!e || (e && e.code === 'EEXIST')) {
                        console.log(`Creando carpeta para PO ${downloadPo} ...`);
                    }
                });

                //Recorrido de referencias
                let i = 1;
                for (const referencia of referencias) {
                    let descargas = [];
                    let linksDownload = {};

                    //Click en referencia
                    const waitForWindow = new Promise(resolve => page.on('popup', resolve));
                    await page.waitForTimeout(2000);
                    await page.click(`#${referencia}`);
                    const newPage = await waitForWindow;


                    //Extracciond de nombre Po
                    await newPage.waitForSelector('#ctl00_Contenido_tabContenedor_tabDatosGenerales_lblpedido');
                    const refPO = await newPage.evaluate(() => {
                        const text = document.querySelector('#ctl00_Contenido_tabContenedor_tabDatosGenerales_lblpedido').textContent;
                        return text;
                    });

                    const pathRef = `${downloadFolder}/${refPO}-ref${i}`;
                    const downloadRef = path.resolve(pathRef);

                    fs.mkdir(pathRef, function (e) {
                        if (!e || (e && e.code === 'EEXIST')) {
                            console.log(`Creando carpeta para referencia ${refPO} ...`);
                        }
                    });

                    //Extraccion de links

                    const linksPrincipales = await newPage.evaluate(() => {
                        let links = {
                            hojaCalculo: document.querySelector('#ctl00_Contenido_tabContenedor_tabDatosGenerales_hlHojaC').href,
                            manifestacionValor: document.querySelector('#ctl00_Contenido_tabContenedor_tabDatosGenerales_hlManifestacionValor').href,
                            cuentaGastos: [
                                document.querySelector('#ctl00_Contenido_tabContAntGtos_tabComprobantes_lblFolioCG').href,
                                document.querySelector('#ctl00_Contenido_tabContAntGtos_tabComprobantes_lblXMLCG').href,
                                document.querySelector('#ctl00_Contenido_tabContAntGtos_tabComprobantes_lblFolioFG').href
                            ]
                        };

                        let indNot = 0;
                        const adicionales = document.querySelectorAll('#ctl00_Contenido_tabContAntGtos_tabComprobantes_gvAdiciones tbody tr');
                        adicionales.forEach(fila => {
                            if (indNot != 0) {
                                links.adicionales = fila.querySelector('a[href').href;
                            }
                            indNot++;
                        });

                        return links;
                    });

                    const facturas = await newPage.evaluate(() => {
                        let links = {};
                        let linksFacturas = [];
                        let linksComplementos = [];
                        let indNot = 0;
                        const countLinks = document.querySelectorAll('#ctl00_Contenido_tabContAntGtos_tabComprobantes_tabContFacturasProveedores_tabContFacturasProveedores_Facturas_gvFacturasProveedores > tbody > tr');
                        countLinks.forEach((link) => {
                            if (indNot != 0) {
                                const linksF = link.querySelectorAll('td:first-child > div > table td');
                                const linksC = link.querySelectorAll('td:last-child > div > table td');
                                linksFacturas.push(linksF[1].querySelector('a').href);
                                linksFacturas.push(linksF[2].querySelector('a').href);

                                linksComplementos.push(linksC[1] ? linksC[1].querySelector('a').href : '');
                                linksComplementos.push(linksC[2] ? linksC[2].querySelector('a').href : '');
                            }
                            indNot++;
                        });

                        links.facturas = linksFacturas;
                        links.complementos = linksComplementos;

                        return links;
                    });

                    await newPage.click('#__tab_ctl00_Contenido_tabContAntGtos_tabComprobantes_tabContFacturasProveedores_tabContFacturasProveedores_Comprobantes');
                    await newPage.waitForTimeout(5000);
                    const comprobantes = await newPage.evaluate(() => {
                        let links = { comprobantes: [] };
                        let indNot = 0;
                        const countLinks = document.querySelectorAll('#ctl00_Contenido_tabContAntGtos_tabComprobantes_tabContFacturasProveedores_tabContFacturasProveedores_Comprobantes_gvComprobantesSIA  > tbody > tr');

                        countLinks.forEach((link) => {
                            if (indNot != 0) {
                                let linkComprobante = link.querySelector('td a');
                                links.comprobantes.push(linkComprobante.href);
                            }
                            indNot++;
                        });

                        return links;
                    });

                    await newPage.click('#__tab_ctl00_Contenido_tabContenedor_tabFacturas');
                    await newPage.waitForTimeout(5000);

                    const coves = await newPage.evaluate(() => {
                        const countLinks = document.querySelectorAll('#ctl00_Contenido_tabContenedor_tabFacturas_gvFacturas > tbody > tr');
                        let links = { coves: [] };
                        let indNot = 0;

                        countLinks.forEach((link) => {
                            if (indNot != 0) {
                                let linksCove = link.querySelector('td:nth-child(3) > table > tbody > tr:nth-child(1) > td:nth-child(1) > a');
                                links.coves.push(linksCove.href);
                            }

                            indNot++;
                        });

                        return links;
                    });

                    await newPage._client.send('Page.setDownloadBehavior', {
                        behavior: 'allow',
                        downloadPath: downloadRef
                    });

                    const clicks = await newPage.evaluate(() => {
                        const countClicks = document.querySelectorAll('#ctl00_Contenido_tabContenedor_tabFacturas_gvFacturas > tbody > tr');
                        let clickId = [];
                        let indNot = 0;

                        countClicks.forEach((link) => {
                            if (indNot != 0) {
                                let elementClick = link.querySelector('td:nth-child(3) > table > tbody > tr:nth-child(3) > td > a');
                                clickId.push(elementClick.id);
                            }

                            indNot++;
                        });

                        return clickId;
                    });

                    await newPage.waitForTimeout(3000);
                    for (const id of clicks) {
                        await newPage.click(`#${id}`);
                        await newPage.waitForTimeout(3000);
                    }

                    await newPage.waitForTimeout(3000);
                    await newPage.click('#__tab_ctl00_Contenido_tabContenedor_tabDocumentos');
                    await newPage.waitForTimeout(5000);

                    const docFaltantes = await newPage.evaluate(() => {
                        let links = {
                            BL: document.querySelector('#ctl00_Contenido_tabContenedor_tabDocumentos_RepeaterBls_ctl00_hlBls').href,
                            acuses: []
                        };

                        const listaDoc = document.querySelectorAll('#ctl00_Contenido_tabContenedor_tabDocumentos_updocu > table > tbody > tr:nth-child(2) > td:first-child > table > tbody > tr:nth-child(2) > td > div > li');

                        listaDoc.forEach((link) => {
                            if (link.querySelector('a').innerText === 'DODAQR.PDF') {
                                links.DODA = link.querySelector('a').href;
                            }
                        });

                        const eDocs = document.querySelectorAll('#ctl00_Contenido_tabContenedor_tabDocumentos_gvEdocuments> tbody > tr');
                        let indNot = 0;
                        eDocs.forEach((fila) => {
                            if (indNot != 0) {
                                const linksEDocs = fila.querySelector('td:first-child a').href;
                                links.acuses.push(linksEDocs);
                            }
                            indNot++;
                        });

                        console.log(links);

                        return links;
                    });

                    await newPage.close();

                    linksDownload = { ...linksPrincipales, ...facturas, ...comprobantes, ...coves, ...docFaltantes };

                    for (const key in linksDownload) {
                        if (Object.hasOwnProperty.call(linksDownload, key)) {
                            const element = linksDownload[key];
                            if (Array.isArray(element)) {
                                for (const item of element) {
                                    descargas.push(item);
                                }
                            } else {
                                descargas.push(element);
                            }
                        }
                    }

                    await this.download(descargas, downloadPo, pathRef)
                        .then(msj => console.log(`\x1b[92m${msj}\x1b[0m`))
                        .catch(err => {
                            console.log(`\x1b[91m${err.message}\x1b[0m`);
                        });

                    i++;
                }

                resolve(`\nSe han descargado ${i - 1} referencias\n`);
            } else {
                reject(new Error(`\nNo se encontraron referencias para la PO ${downloadPo}\n`));
            }
        });
    };

    this.linkEach = async (links, po, pathDownload) => {
        for (const link of links) {
            if (link != '') {
                const valHttp = link.split(':');
                const status = await downloadFiles(valHttp[0], link, po, pathDownload)
                    .then(msj => console.log(`\x1b[92m${msj} - Downloaded\x1b[0m`));
            }
        }
    };

    this.download = (links, po, pathDownload) => {
        return new Promise(async (resolve) => {
            console.info('Descargando archivos ...');
            const timeOut = links.length * .4 * 1000;

            const descargas = this.linkEach(links, po, pathDownload);

            setTimeout(() => {
                resolve('\n\nDescargas completadas');
            }, timeOut);
        });
    };
};