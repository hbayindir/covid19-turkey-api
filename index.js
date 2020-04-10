const fs = require('fs');
const axios = require('axios');
const moment = require('moment-timezone');
const { JSDOM } = require('jsdom');
const { Parser } = require('json2csv');

moment.updateLocale('tr', {
    months: ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK']
});
moment.locale('tr');

const queries = {
    totalTests: '#bg-logo > div.row > div:nth-child(1) > div.row > div:nth-child(1) > div > ul > li:nth-child(1) > span:nth-child(2)',
    totalCases: '#bg-logo > div.row > div:nth-child(1) > div.row > div:nth-child(1) > div > ul > li:nth-child(2) > span:nth-child(2)',
    totalDeaths: '#bg-logo > div.row > div:nth-child(1) > div.row > div:nth-child(1) > div > ul > li:nth-child(3) > span:nth-child(2)',
    totalIntensiveCare: '#bg-logo > div.row > div:nth-child(1) > div.row > div:nth-child(1) > div > ul > li:nth-child(4) > span:nth-child(2)',
    totalIntubated: '#bg-logo > div.row > div:nth-child(1) > div.row > div:nth-child(1) > div > ul > li:nth-child(5) > span:nth-child(2)',
    totalRecovered: '#bg-logo > div.row > div:nth-child(1) > div.row > div:nth-child(1) > div > ul > li:nth-child(6) > span:nth-child(2)',
    date: '#bg-logo > div.row > div:nth-child(1) > div.row > div:nth-child(2) > div > div > div',
    tests: '#bg-logo > div.row > div:nth-child(2) > div > ul > li:nth-child(1) > span.buyuk-bilgi-l-sayi',
    cases: '#bg-logo > div.row > div:nth-child(2) > div > ul > li:nth-child(2) > span:nth-child(2)',
    deaths: '#bg-logo > div.row > div:nth-child(2) > div > ul > li:nth-child(3) > span:nth-child(2)',
    recovered: '#bg-logo > div.row > div:nth-child(2) > div > ul > li:nth-child(4) > span:nth-child(2)'
};

function extractInfo (document, query) {
    return document.querySelector(query).textContent
        .replace(/[\n]/g, '')
        .replace(/[ ]+/g, ' ')
        .replace(/\./g, '')
        .trim();
}

async function update () {
    try {
        const res = await axios.get('https://covid19.saglik.gov.tr/');

        const dom = new JSDOM(res.data, {
            includeNodeLocations: true
        });
        const body = dom.window.document.body;

        const timeline = JSON.parse(fs.readFileSync('dataset/timeline.json'));

        const date = moment(extractInfo(body, queries.date), 'DD MMM YYYY').format('DD/MM/YYYY');

        const fields = ['date', 'totalTests', 'totalCases', 'totalDeaths', 'totalIntensiveCare', 'totalIntubated', 'totalRecovered', 'tests', 'cases', 'deaths', 'recovered'];

        timeline[date] = {};
        for (const field of fields) {
            if (field !== 'date') {
                timeline[date][field] = extractInfo(body, queries[field]);
            }
        }

        const dates = Object.keys(timeline);
        const values = Object.values(timeline).map((v, i) => { v.date = dates[i]; return v; });
        const parser = new Parser({ fields });
        const csv = parser.parse(values);
        fs.writeFileSync('dataset/timeline.csv', csv);
        fs.writeFileSync('dataset/timeline.json', JSON.stringify(timeline));

        // update last check
        fs.unlinkSync('dataset/lastcheck');
        fs.writeFileSync('dataset/lastcheck', `Last update ${moment().tz('Europe/Istanbul').format('DD/MM/YYYY HH:mm:ss:SSS')} GMT+3 Timezone 'Europe/Istanbul'`);
    } catch (e) {
        console.log(e);
    }
}

update();
