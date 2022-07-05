const fs = require('fs');


module.exports = function (file) {
    this.fileTxt = file;
    this.PO = () => {
        let data = [];
        try {
            const pos = fs.readFileSync(`./${this.fileTxt}`, 'utf8');
            data = pos.split(/\r?\n/);
            return data;
        } catch (error) {
            return new Error('Error')
        }
    }
}