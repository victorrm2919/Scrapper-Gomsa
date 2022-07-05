const https = require('https');
const http = require('http');
const fs = require('fs');

function nameFile(url, po) {
  let nameFileSplit = url.split('/');
  let nameFile = nameFileSplit[nameFileSplit.length - 1];
  let nameFileDefined = '';
  let extensionArr = nameFile.split('.');
  let extension = extensionArr[extensionArr.length - 1];

  if (nameFile.includes('DODAQR')) {
    nameFileDefined = '31 - DODA PO' + po;
  } else if (nameFile.includes('HOJADECALCULO')) {
    nameFileDefined = '39 - HOJA DE CALCULO PO' + po;
  } else if (nameFile.includes('ManifestacionDeValor')) {
    nameFileDefined = '38 - MANIFESTACIÓN DE VALOR PO' + po;
  } else if (nameFile.includes('BL%')) {
    nameFileDefined = '11 - BLM PO' + po;
  } else {
    nameFileDefined = extensionArr[0];
  }
  return `${nameFileDefined}.${extension}`;
}

module.exports = async function (type, url, po, path) {

  const conection = type == 'http' ? http.get : https.get;
  const nameFileDefined = nameFile(url, po);

  const pathFile = `${path}/${nameFileDefined}`;
  const file = fs.createWriteStream(pathFile);

  const request = conection(url, res => {
    res.pipe(file);
    file.on("finish", () => {
      file.close();
    });
  });

  return nameFileDefined
};