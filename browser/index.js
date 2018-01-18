/**
 * @fileoverview Description of file, its uses and information
 * about its dependencies.
 */

'use strict';

/**
 *
 * @type {*|exports|module.exports}
 */
var cloud;

/**
 *
 * @type {*|exports|module.exports}
 */
var utils;

/**
 *
 * @type {*|exports|module.exports}
 */
var backboneEvents;

/**
 *
 */
var transformPoint;

/**
 *
 * @type {string}
 */
var exId = "ejendom";

/**
 *
 */
var clicktimer;


/**
 *
 */
var mapObj;

/**
 *
 * @type {*|exports|module.exports}
 */
var search = require('./../../../browser/modules/search/danish');

var store = new geocloud.sqlStore({
    jsonp: false,
    method: "POST",
    host: "https://gc2.io",
    db: "dk",
    clickable: true,
    styleMap: {
        weight: 5,
        color: '#660000',
        dashArray: '',
        fillOpacity: 0.2
    },
    error: function () {
        var m = "Kan ikke hente ejendomsinfo.";
        alert(m);
        throw m;
    }
});

var table;

/**
 *
 * @type {{set: module.exports.set, init: module.exports.init}}
 */

module.exports = module.exports = {

    /**
     *
     * @param o
     * @returns {exports}
     */
    set: function (o) {
        cloud = o.cloud;
        utils = o.utils;
        transformPoint = o.transformPoint;
        backboneEvents = o.backboneEvents;
        return this;
    },

    /**
     *
     */
    init: function () {

        mapObj = cloud.get().map;

        cloud.get().addGeoJsonStore(store);

        /**
         *
         */
        var React = require('react');

        /**
         *
         */
        var ReactDOM = require('react-dom');

        /**
         *
         */
        class Ejendom extends React.Component {
            constructor(props) {
                super(props);

                this.state = {
                    active: false,
                    matTxt: "",
                    notTxt: "",
                    sagsId: "",
                    regDat: "",
                    ejdRes: "",
                    matrNr: null,
                    ejKode: null,
                    tlVisible: false
                };

                this.onActive = this.onActive.bind(this);
                this.onLookUp = this.onLookUp.bind(this);
                this.reset = this.reset.bind(this);

                this.marginBottomXl = {
                    marginBottom: "24px"
                };

                this.marginBottomL = {
                    marginBottom: "12px"
                };
                this.marginBottomS = {
                    marginBottom: "6px"
                };

            }

            onActive(e) {
                this.setState({
                    active: e.target.checked
                });

                if (!e.target.checked) {
                    this.reset();

                    // Turn info click back on
                    backboneEvents.get().trigger("on:infoClick");
                } else {
                    // Turn info click off
                    backboneEvents.get().trigger("off:infoClick");
                }

            }

            reset() {
                this.setState({
                    matTxt: "",
                    notTxt: "",
                    sagsId: "",
                    regDat: "",
                    ejdRes: "",
                    tlVisible: false
                });
                store.reset();
                table.loadDataInTable();
            }

            onLookUp() {
                window.open("tlexpl://?m=" + this.state.ejKode + "," + this.state.matrNr);
            }

            makeSearch(geojson, zoom) {
                var me = this, properties, area = 0, count = 0,
                    str = JSON.stringify(geojson),
                    sql = "SELECT * FROM matrikel.jordstykke WHERE esr_ejendomsnummer = (SELECT esr_ejendomsnummer FROM matrikel.jordstykke WHERE the_geom && ST_PointOnSurface(ST_Transform(St_setSrid(ST_GeomFromGeoJSON('" + str + "'),4326),25832)) AND ST_Intersects(the_geom, ST_PointOnSurface(ST_Transform(St_setSrid(ST_GeomFromGeoJSON('" + str + "'),4326),25832))) LIMIT 1) ORDER BY ST_Distance(ST_PointOnSurface(ST_Transform(St_setSrid(ST_GeomFromGeoJSON('" + str + "'),4326),25832)), the_geom)";

                store.reset();

                store.abort();

                store.sql = sql;

                store.onLoad = function () {
                    if (this.geoJSON.features.length === 0) {
                        me.reset();
                        return;
                    }

                    properties = this.geoJSON.features[0].properties;

                    this.geoJSON.features.map(function (f) {
                        area = area + parseInt(f.properties.registreretareal);
                        count++;
                    });

                    if (zoom) {
                        cloud.get().zoomToExtentOfgeoJsonStore(this, 18);
                    }
                    me.setState({});
                    me.setState({
                        matTxt: properties.matrikelnummer + " " + properties.ejerlavsnavn,
                        notTxt: (properties.l_noteringstype !== null ? properties.l_noteringstype : "Samlet fast ejendom"),
                        sagsId: properties.sfe_sagsid,
                        regDat: properties.sfe_registreringsdato,
                        ejdRes: "I alt: " + count + " matr.nr(e) med et samlet areal på:  	" + area + "   m²",
                        matrNr: properties.matrikelnummer,
                        ejKode: properties.landsejerlavskode,
                        tlVisible: true
                    });
                    table.loadDataInTable();
                };

                store.load();
            }

            componentDidMount() {
                var me = this;

                (function poll() {
                    if (gc2table.isLoaded()) {
                        table = gc2table.init({
                            el: "#gc2-ejd-table",
                            geocloud2: cloud.get(),
                            store: store,
                            ns: "#" + exId,
                            cm: [
                                {
                                    header: "Matrikelnr.",
                                    dataIndex: "matrikelnummer",
                                    sortable: true
                                }, {
                                    header: "Ejerlav",
                                    dataIndex: "ejerlavsnavn",
                                    sortable: true
                                }, {
                                    header: "Kommune",
                                    dataIndex: "kommunenavn",
                                    sortable: true
                                }
                            ],
                            autoUpdate: false,
                            autoPan: false,
                            openPopUp: true,
                            setViewOnSelect: false,
                            responsive: false,
                            callCustomOnload: false,
                            height: 400,
                            locale: window._vidiLocale.replace("_", "-")
                        });

                    } else {
                        setTimeout(poll, 20);
                    }
                }());


                // Init search with custom callback
                search.init(function () {
                    me.makeSearch(this.geoJSON.features[0].geometry, true)
                }, "ejendom-custom-search");


                // Handle click events on map
                // ==========================

                mapObj.on("dblclick", function () {
                    clicktimer = undefined;
                });
                mapObj.on("click", function (e) {
                    var event = new geocloud.clickEvent(e, cloud);
                    if (clicktimer) {
                        clearTimeout(clicktimer);
                    }
                    else {
                        if (me.state.active === false) {
                            return;
                        }

                        clicktimer = setTimeout(function (e) {

                            clicktimer = undefined;

                            var coords = event.getCoordinate(), p;
                            p = utils.transform("EPSG:3857", "EPSG:4326", coords);

                            me.makeSearch(
                                {
                                    coordinates: [p.x, p.y],
                                    type: "Point"
                                }
                            );


                        }, 250);
                    }
                });
            }

            render() {

                return (

                    <div role="tabpanel">
                        <div className="panel panel-default">
                            <div className="panel-body">
                                <div className="form-group">
                                    <div className="togglebutton">
                                        <label><input id="ejendom-btn" type="checkbox"
                                                      defaultChecked={ this.state.active } onChange={this.onActive}/>Aktiver klik i kortet</label>
                                    </div>
                                </div>

                                <div id="conflict-places" className="places" style={this.marginBottomXl}>
                                    <input id="ejendom-custom-search"
                                           className="ejendom-custom-search typeahead" type="text"
                                           placeholder="Adresse eller matrikelnr."/>
                                </div>
                                {
                                    this.state.tlVisible
                                        ?
                                        <div>
                                            <div style={this.marginBottomL}>
                                                <span>Fundet matrikelnr.: </span><span>{this.state.matTxt}</span>
                                            </div>

                                            <div style={this.marginBottomS}>

                                                <button className="btn btn-raised" onClick={this.onLookUp}>Start
                                                    TLExplorer
                                                </button>

                                                <button className="btn btn-raised btn-danger" onClick={this.reset}>Ryd
                                                </button>

                                            </div>

                                            <div style={this.marginBottomS}>
                                                <span>Sagsid for ejendommen: </span><span>{this.state.sagsId}</span>
                                            </div>

                                            <div style={this.marginBottomS}>
                                                <span>Seneste ændringsdato for ejendommen: </span><span>{this.state.regDat}</span>
                                            </div>

                                            <div style={this.marginBottomS}>
                                                <span>Følgende matr.nre. er en samlet fast ejendom med Noteringstype: </span><span>{this.state.notTxt}</span>
                                            </div>

                                        </div> : null
                                }
                                <div>
                                    <table id="gc2-ejd-table" className="table" data-detail-view="true"
                                           data-detail-formatter="detailFormatter"
                                           data-show-toggle="true"
                                           data-show-export="true"/>
                                </div>
                                <div>
                                    {this.state.ejdRes}
                                </div>


                            </div>
                        </div>
                    </div>
                );
            }
        }

        utils.createMainTab(exId, "Ejendom", "Se Samlede Faste Ejendomme. Aktiver 'Klik i kortet' og klik hvor du vil fremsøge ejendommen. Eller søg på adresse eller matrikelnr. I tabellen vises hvilke jordstykker ejendommen består af. ", require('./../../../browser/modules/height')().max);

        // Append to DOM
        //==============
        try {

            ReactDOM.render(
                <Ejendom />,
                document.getElementById(exId)
            );
        } catch (e) {

        }

    }
};


