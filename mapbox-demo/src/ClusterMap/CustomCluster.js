import React, { Component } from 'react'

import ReactDOM from 'react-dom';
import mapboxgl from 'mapbox-gl';

import _ from 'lodash'

import './SimpleCluster.css'
import './customCluster.css'
import MapboxglSpiderifier from "./maboxSpiderfier";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

class CustomCluster extends Component {

    constructor(props) {
        super(props);
        this.state = {
            lng: 5,
            lat: 34,
            zoom: 2,
            map: null
        };
    }

     initializeSpiderLeg = (spiderLeg) => {
        let pinElem = spiderLeg.elements.pin;
        let feature = spiderLeg.feature;
        let popup;
        let {map} = this.state;

        // pinElem.className = pinElem.className + ' strong-earthquake';

        // console.log(feature)

        if (feature.mag > 5) {
            pinElem.innerHTML = '<i class="bi bi-emoji-dizzy-fill strong-earthquake"></i>'
        } else {
            pinElem.innerHTML = '<i class="bi bi-emoji-laughing-fill weak-earthquake"></i>'
        }

        pinElem.className = 'custom-pin'


        pinElem.addEventListener("mouseenter", function(){
            popup = new mapboxgl.Popup({
                closeButton: true,
                closeOnClick: false,
                offset: MapboxglSpiderifier.popupOffsetForSpiderLeg(spiderLeg)
            });

            let html = '';

            if (feature.mag > 5) {
                html = `<p>Strong, Mag: <b>${feature.mag}</b></p>
                        <p>Time: ${new Date(feature.time).toLocaleDateString("en-US")}</p>
                        <p>Tsunami: ${feature.tsunami}</p>
                        <p>Latitude: ${feature.lat}</p>
                        <p>Longitude: ${feature.lon}</p>`
            } else {
                html = `<p>Weak, Mag: <b>${feature.mag}</b></p>
                        <p>Time: ${new Date(feature.time).toLocaleDateString("en-US")}</p>
                        </p><p>Tsunami: ${feature.tsunami}</p>
                        <p>Latitude: ${feature.lat}</p>
                        <p>Longitude: ${feature.lon}</p>`
            }

            popup.setHTML(html)
                .addTo(map)

            spiderLeg.mapboxMarker.setPopup(popup);
        }, false);

         pinElem.addEventListener("mouseleave", function(){
             if(popup){
                 popup.remove();
             }
         }, false);

    }

    componentDidMount() {
        let map = new mapboxgl.Map({
            container: 'mapboxContainer',
            zoom: 0.3,
            center: [0, 20],
            style: 'mapbox://styles/mapbox/light-v10'
        });

        let spiderifier = new MapboxglSpiderifier(map, {
            animate: true,
            customPin: true,
            animationSpeed: 200,
            onClick: function(e, marker){
                // console.log(marker);
            },
            initializeLeg: this.initializeSpiderLeg
        });

        map.addControl(new mapboxgl.NavigationControl());

// filters for classifying earthquakes into five categories based on magnitude
        let mag1 = ['<', ['get', 'mag'], 2];
        let mag2 = ['all', ['>=', ['get', 'mag'], 2], ['<', ['get', 'mag'], 3]];
        let mag3 = ['all', ['>=', ['get', 'mag'], 3], ['<', ['get', 'mag'], 4]];
        let mag4 = ['all', ['>=', ['get', 'mag'], 4], ['<', ['get', 'mag'], 5]];
        let mag5 = ['>=', ['get', 'mag'], 5];

// colors to use for the categories
        let colors = ['#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c'];

        map.on('load', function () {
// add a clustered GeoJSON source for a sample set of earthquakes
            map.addSource('earthquakes', {
                'type': 'geojson',
                'data': `${process.env.REACT_APP_EARTHQUKES_API}?count=1000`,
                'cluster': true,
                'clusterRadius': 80,
                'clusterProperties': {
// keep separate counts for each magnitude category in a cluster
                    'mag1': ['+', ['case', mag1, 1, 0]],
                    'mag2': ['+', ['case', mag2, 1, 0]],
                    'mag3': ['+', ['case', mag3, 1, 0]],
                    'mag4': ['+', ['case', mag4, 1, 0]],
                    'mag5': ['+', ['case', mag5, 1, 0]]
                }
            });
// circle and symbol layers for rendering individual earthquakes (unclustered points)
            map.addLayer({
                'id': 'earthquake_circle',
                'type': 'circle',
                'source': 'earthquakes',
                'filter': ['!=', 'cluster', true],
                'paint': {
                    'circle-color': [
                        'case',
                        mag1,
                        colors[0],
                        mag2,
                        colors[1],
                        mag3,
                        colors[2],
                        mag4,
                        colors[3],
                        colors[4]
                    ],
                    'circle-opacity': 0.6,
                    'circle-radius': 12
                }
            });
            map.addLayer({
                'id': 'earthquake_label',
                'type': 'symbol',
                'source': 'earthquakes',
                'filter': ['!=', 'cluster', true],
                'layout': {
                    'text-field': [
                        'number-format',
                        ['get', 'mag'],
                        { 'min-fraction-digits': 1, 'max-fraction-digits': 1 }
                    ],
                    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                    'text-size': 10
                },
                'paint': {
                    'text-color': [
                        'case',
                        ['<', ['get', 'mag'], 3],
                        'black',
                        'white'
                    ]
                }
            });

// objects for caching and keeping track of HTML marker objects (for performance)
            let markers = {};
            let markersOnScreen = {};

            function updateMarkers() {
                let newMarkers = {};
                let features = map.querySourceFeatures('earthquakes');

                // console.log(features.length)

// for every cluster on the screen, create an HTML marker for it (if we didn't yet),
// and add it to the map if it's not there already
                for (let i = 0; i < features.length; i++) {
                    // console.log(features[i])
                    let coords = features[i].geometry.coordinates;
                    let props = features[i].properties;
                    if (!props.cluster) continue;
                    let id = props.cluster_id;

                    let marker = markers[id];
                    if (!marker) {
                        let el = createDonutChart(features[i]);
                        marker = markers[id] = new mapboxgl.Marker({
                            element: el
                        }).setLngLat(coords);
                    }
                    newMarkers[id] = marker;

                    if (!markersOnScreen[id]) marker.addTo(map);
                }
// for every marker we've added previously, remove those that are no longer visible
                for (let id in markersOnScreen) {
                    if (!newMarkers[id]) markersOnScreen[id].remove();
                }
                markersOnScreen = newMarkers;
            }

// after the GeoJSON data is loaded, update markers on the screen and do so on every map move/moveend
            map.on('data', function (e) {
                if (e.sourceId !== 'earthquakes' || !e.isSourceLoaded) return;

                map.on('move', updateMarkers);
                map.on('moveend', updateMarkers);
                updateMarkers();
            });
        });

// code for creating an SVG donut chart from feature properties
        function createDonutChart(feature) {
            let props = feature.properties;
            let offsets = [];
            let counts = [
                props.mag1,
                props.mag2,
                props.mag3,
                props.mag4,
                props.mag5
            ];
            let total = 0;
            for (let i = 0; i < counts.length; i++) {
                offsets.push(total);
                total += counts[i];
            }

            let fontSize =
                total >= 1000 ? 22 : total >= 100 ? 20 : total >= 10 ? 18 : 16;
            let r = total >= 1000 ? 50 : total >= 100 ? 32 : total >= 10 ? 24 : 18;
            let r0 = Math.round(r * 0.6);
            let w = r * 2;

            let html =
                '<div><svg width="' +
                w +
                '" height="' +
                w +
                '" viewbox="0 0 ' +
                w +
                ' ' +
                w +
                '" text-anchor="middle" style="font: ' +
                fontSize +
                'px sans-serif; display: block">';

            for (let i = 0; i < counts.length; i++) {
                html += donutSegment(
                    offsets[i] / total,
                    (offsets[i] + counts[i]) / total,
                    r,
                    r0,
                    colors[i]
                );
            }


            html +=
                '<circle cx="' +
                r +
                '" cy="' +
                r +
                '" r="' +
                r0 +
                '" fill="white" /><text dominant-baseline="central" transform="translate(' +
                r +
                ', ' +
                r +
                ')">' +
                total.toLocaleString() +
                '</text></svg></div>';


            function mouseClick(e) {

                console.log(props)

/*                    if (props.point_count > 100) {

                        map.getSource('earthquakes').getClusterLeaves(
                            props.cluster_id,
                            10000,
                            0,
                            function (err, leafFeatures) {
                                if (err) {
                                    return console.error('error while getting leaves of a cluster', err);
                                }
                                map.getSource('earthquakes').getClusterExpansionZoom(
                                    props.cluster_id,
                                    function (err, zoom) {
                                        if (err) return;

                                        console.log(leafFeatures)

                                        map.easeTo({
                                            center: leafFeatures[0].geometry.coordinates,
                                            zoom: zoom
                                        });
                                    }
                                );
                            }
                        );
                    } else {*/

                if (props.point_count < 100) {
                        map.getSource('earthquakes').getClusterLeaves(
                            props.cluster_id,
                            10000,
                            0,
                            function (err, leafFeatures) {
                                if (err) {
                                    return console.error('error while getting leaves of a cluster', err);
                                }
                                var markers = _.map(leafFeatures, function (leafFeature) {
                                    return leafFeature.properties;
                                });
                                // console.log(markers)
                                spiderifier.spiderfy(feature.geometry.coordinates, markers);
                            }
                        );
                    }
            }

            let el = document.createElement('div');
            el.innerHTML = html;
            el.firstChild.addEventListener("click", mouseClick, false);
            return el.firstChild;
        }

        function donutSegment(start, end, r, r0, color) {
            if (end - start === 1) end -= 0.00001;
            let a0 = 2 * Math.PI * (start - 0.25);
            let a1 = 2 * Math.PI * (end - 0.25);
            let x0 = Math.cos(a0),
                y0 = Math.sin(a0);
            let x1 = Math.cos(a1),
                y1 = Math.sin(a1);
            let largeArc = end - start > 0.5 ? 1 : 0;

            return [
                '<path d="M',
                r + r0 * x0,
                r + r0 * y0,
                'L',
                r + r * x0,
                r + r * y0,
                'A',
                r,
                r,
                0,
                largeArc,
                1,
                r + r * x1,
                r + r * y1,
                'L',
                r + r0 * x1,
                r + r0 * y1,
                'A',
                r0,
                r0,
                0,
                largeArc,
                0,
                r + r0 * x0,
                r + r0 * y0,
                '" fill="' + color + '" />'
            ].join(' ');
        }

        map.on('click', 'earthquake_circle', function (e) {
            // console.log(e)
        });

        map.on('click', function (e) {
            spiderifier.unspiderfy();
        });

        this.setState({map})

    }

    render() {
        return (
            <div>
                <div className='sidebarStyle'>
                    <div>Longitude: {this.state.lng} | Latitude: {this.state.lat} | Zoom: {this.state.zoom}</div>
                </div>
                <div id='mapboxContainer' className="mapContainer"/>
            </div>
        );
    }
}

export default CustomCluster;
