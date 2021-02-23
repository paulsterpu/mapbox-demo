const express = require('express')
const cors = require('cors')
const DateGenerator = require('random-date-generator');
const randomId = require('random-id');

const app = express()
const port = 3030

const idLen = 30;
const pattern = 'aA0';

app.use(cors());

function getRandomMagnitude() {
    return Math.floor(Math.random() * 100)/10;
}

function getRandomFelt() {
    let felt =  Math.random() * 300;
    felt = felt < 50 ? null : felt;
    return felt;
}

function getRandomBoolean() {
    return Math.random() < 0.5;
}

function getRandomLatitude() {
    const isNegative = getRandomBoolean();
    const x = isNegative ? -1 : 1;
    return Math.random() * 90 * x;
}

function getRandomLongitude() {
    const isNegative = getRandomBoolean();
    const x = isNegative ? -1 : 1;
    return Math.random() * 180 * x;
}

app.get('/', async function(req, res) {

    let count = req.query.count ? req.query.count : 10;
    let features = [];
    let geoJson  = {
        "type": "FeatureCollection",
        "crs": {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
    };

    for (let i = 0; i < count; i++) {
        let lat = getRandomLongitude();
        let lon = getRandomLatitude();

        features.push({
            properties: {
                id: randomId(idLen, pattern),
                mag: getRandomMagnitude(),
                time: DateGenerator.getRandomDate().getTime(),
                felt: getRandomFelt(),
                tsunami: getRandomBoolean(),
                lat,
                lon,
            },
            geometry: {
                type: "Point",
                coordinates: [
                    lat,
                    lon,
                    0
                ]
            }
        })
    }

    geoJson.features = features;

    res.json(geoJson);


});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})