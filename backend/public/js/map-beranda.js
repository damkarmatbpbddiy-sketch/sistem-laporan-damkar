/* ============================================================
   SISTEM LAPORAN KEBAKARAN DAMKAR DIY
   MAP-BERANDA.JS
   KHUSUS WEBSITE BERANDA
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

    /* ========================================================
       1. CEK CONTAINER BERANDA
       ======================================================== */

    const mapElement =
        document.getElementById('main-live-map');

    if (!mapElement) {
        console.warn(
            'Container #main-live-map tidak ditemukan.'
        );
        return;
    }

    if (typeof L === 'undefined') {
        console.error(
            'Leaflet belum dimuat.'
        );
        return;
    }


    /* ========================================================
       2. INISIALISASI PETA BERANDA
       ======================================================== */

    const map =
        L.map('main-live-map', {
            zoomControl: true,
            scrollWheelZoom: true
        })
        .setView(
            [-7.7956, 110.3695],
            10
        );


    L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            attribution:
                '&copy; OpenStreetMap contributors',

            maxZoom: 19
        }
    ).addTo(map);

    if (!map.getPane('pane_kabupaten_boundary')) {
        map.createPane('pane_kabupaten_boundary');
        map.getPane('pane_kabupaten_boundary').style.zIndex = '450';
    }
    if (!map.getPane('pane_provinsi_boundary')) {
        map.createPane('pane_provinsi_boundary');
        map.getPane('pane_provinsi_boundary').style.zIndex = '460';
    }


    /* ========================================================
       3. SEMUA LAYER
       ======================================================== */

    const kabupatenLayer =
        L.layerGroup();

    const provinsiLayer =
        L.layerGroup();

    const kecamatanLayer =
        L.layerGroup();

    const jalanLayer =
        L.layerGroup();

    const desaLayer =
        L.layerGroup();

    const damkarLayer =
        L.layerGroup();

    const bufferDamkarLayer =
        L.layerGroup();

    const laporanLayer =
        L.layerGroup();

    const nonKebakaranLayer =
        L.layerGroup();

    const pertanianLayer =
        L.layerGroup();

    const tangkiAirLayer =
        L.layerGroup();

    const srsLayer =
        L.layerGroup();

    const cagarBudayaLayer =
        L.layerGroup();

    const sumbuFilosofisLayer =
        L.layerGroup();

    const kebakaranTematikLayer =
        L.layerGroup();

    const nonKebakaranTematikLayer =
        L.layerGroup();


    /* ========================================================
       4. VARIABEL DATA
       ======================================================== */

    let dataKabupaten = null;
    let dataKecamatan = null;
    let dataDesa = null;
    let dataLaporan = [];

    let jumlahPosDamkar = 0;


    /* ========================================================
       5. WARNA PETA KEBAKARAN
       ======================================================== */

    function warnaKebakaran(jumlah) {

        if (jumlah === 0) {
            return '#e8f5e9';
        }

        if (jumlah === 1) {
            return '#fff566';
        }

        if (jumlah === 2) {
            return '#ffa940';
        }

        return '#ff4d4f';
    }


    function kategoriKebakaran(jumlah) {

        if (jumlah === 0) {
            return '0 kejadian';
        }

        if (jumlah === 1) {
            return '1 kejadian';
        }

        if (jumlah === 2) {
            return '2 kejadian';
        }

        return '3 kejadian atau lebih';
    }


    /* ========================================================
       6. KONVERSI EPSG:32749
       SAMA DENGAN MAP ADMIN
       ======================================================== */

    function utm49SouthToWgs84(
        easting,
        northing
    ) {

        const a = 6378137.0;
        const eccSquared = 0.00669438;
        const k0 = 0.9996;

        const x =
            Number(easting) - 500000;

        const y =
            Number(northing) - 10000000;

        const eccPrimeSquared =
            eccSquared /
            (1 - eccSquared);

        const M =
            y / k0;

        const mu =
            M /
            (
                a *
                (
                    1 -
                    eccSquared / 4 -
                    3 * eccSquared * eccSquared / 64 -
                    5 * Math.pow(eccSquared, 3) / 256
                )
            );

        const e1 =
            (
                1 -
                Math.sqrt(1 - eccSquared)
            ) /
            (
                1 +
                Math.sqrt(1 - eccSquared)
            );

        const J1 =
            3 * e1 / 2 -
            27 * Math.pow(e1, 3) / 32;

        const J2 =
            21 * Math.pow(e1, 2) / 16 -
            55 * Math.pow(e1, 4) / 32;

        const J3 =
            151 * Math.pow(e1, 3) / 96;

        const J4 =
            1097 * Math.pow(e1, 4) / 512;

        const fp =
            mu +
            J1 * Math.sin(2 * mu) +
            J2 * Math.sin(4 * mu) +
            J3 * Math.sin(6 * mu) +
            J4 * Math.sin(8 * mu);

        const sinFp =
            Math.sin(fp);

        const cosFp =
            Math.cos(fp);

        const tanFp =
            Math.tan(fp);

        const C1 =
            eccPrimeSquared *
            Math.pow(cosFp, 2);

        const T1 =
            Math.pow(tanFp, 2);

        const N1 =
            a /
            Math.sqrt(
                1 -
                eccSquared *
                Math.pow(sinFp, 2)
            );

        const R1 =
            a *
            (1 - eccSquared) /
            Math.pow(
                1 -
                eccSquared *
                Math.pow(sinFp, 2),
                1.5
            );

        const D =
            x /
            (N1 * k0);

        const lat =
            fp -
            (
                N1 *
                tanFp /
                R1
            ) *
            (
                Math.pow(D, 2) / 2 -

                (
                    5 +
                    3 * T1 +
                    10 * C1 -
                    4 * Math.pow(C1, 2) -
                    9 * eccPrimeSquared
                ) *
                Math.pow(D, 4) / 24 +

                (
                    61 +
                    90 * T1 +
                    298 * C1 +
                    45 * Math.pow(T1, 2) -
                    252 * eccPrimeSquared -
                    3 * Math.pow(C1, 2)
                ) *
                Math.pow(D, 6) / 720
            );

        const lon =
            (
                D -
                (
                    1 +
                    2 * T1 +
                    C1
                ) *
                Math.pow(D, 3) / 6 +

                (
                    5 -
                    2 * C1 +
                    28 * T1 -
                    3 * Math.pow(C1, 2) +
                    8 * eccPrimeSquared +
                    24 * Math.pow(T1, 2)
                ) *
                Math.pow(D, 5) / 120
            ) /
            cosFp;

        const toDegrees =
            radians =>
                radians * 180 / Math.PI;

        return {
            lat: toDegrees(lat),
            lng: 111 + toDegrees(lon)
        };
    }


    /* ========================================================
       7. KONVERSI GEOJSON
       ======================================================== */

    function convertGeometry(
        geometry
    ) {

        if (!geometry) {
            return geometry;
        }

        function convertCoordinates(
            coords
        ) {

            if (
                Array.isArray(coords) &&
                typeof coords[0] === 'number' &&
                typeof coords[1] === 'number'
            ) {

                const result =
                    utm49SouthToWgs84(
                        coords[0],
                        coords[1]
                    );

                return [
                    result.lng,
                    result.lat
                ];
            }

            return coords.map(
                convertCoordinates
            );
        }

        return {
            ...geometry,

            coordinates:
                convertCoordinates(
                    geometry.coordinates
                )
        };
    }


    function convertUtmGeoJSON(data) {

        if (
            !data ||
            data.type !== 'FeatureCollection'
        ) {
            return data;
        }

        return {
            type: 'FeatureCollection',

            features:
                data.features.map(
                    feature => ({
                        ...feature,

                        geometry:
                            convertGeometry(
                                feature.geometry
                            )
                    })
                )
        };
    }


    /* ========================================================
       8. LOAD JSON
       ======================================================== */

    async function loadJSON(url) {

        const response =
            await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Gagal mengambil ${url}`
            );
        }

        return await response.json();
    }

    async function loadShapefile(paths, convertUtm = false) {
        if (typeof shp === 'undefined' || typeof shp.parseShp !== 'function') {
            throw new Error('Parser Shapefile shpjs belum dimuat');
        }
        const [shpBuffer, dbfBuffer, prjText] = await Promise.all([
            fetch(paths.shp).then(response => {
                if (!response.ok) throw new Error(`${paths.shp} HTTP ${response.status}`);
                return response.arrayBuffer();
            }),
            fetch(paths.dbf).then(response => {
                if (!response.ok) throw new Error(`${paths.dbf} HTTP ${response.status}`);
                return response.arrayBuffer();
            }),
            fetch(paths.prj).then(response => {
                if (!response.ok) throw new Error(`${paths.prj} HTTP ${response.status}`);
                return response.text();
            })
        ]);
        if (!prjText.trim()) throw new Error(`${paths.prj} kosong`);
        const geometries = shp.parseShp(shpBuffer);
        const properties = shp.parseDbf(dbfBuffer);
        const geojson = {
            type: 'FeatureCollection',
            features: geometries.map((geometry, index) => ({
                type: 'Feature',
                properties: properties[index] || {},
                geometry
            }))
        };
        return convertUtm ? convertUtmGeoJSON(geojson) : geojson;
    }


    /* ========================================================
       9. NAMA WILAYAH
       ======================================================== */

    function getNamaWilayah(
        properties = {}
    ) {

        return (
            properties.nama ||
            properties.NAMA ||
            properties.Nama ||
            properties.kecamatan ||
            properties.KECAMATAN ||
            properties.WADMKC ||
            properties.kab_kota ||
            properties.kabupaten ||
            properties.KABUPATEN ||
            properties.WADMKK ||
            properties.NAMOBJ ||
            'Wilayah'
        );
    }


    /* ========================================================
       10. CENTER WILAYAH
       ======================================================== */

    function getCenterOfFeature(
        feature
    ) {

        try {

            const layer =
                L.geoJSON(feature);

            return layer
                .getBounds()
                .getCenter();

        } catch (error) {

            return null;
        }
    }


    /* ========================================================
       11. LABEL WILAYAH
       ======================================================== */

    function buatLabelWilayah(
        feature,
        jumlah
    ) {

        const center =
            getCenterOfFeature(
                feature
            );

        if (!center) {
            return null;
        }

        const nama =
            getNamaWilayah(
                feature.properties || {}
            );

        return L.marker(
            center,
            {
                icon: L.divIcon({
                    className:
                        'map-area-label',

                    html: `
                        <div style="
                            font-size:10px;
                            font-weight:700;
                            color:#111827;
                            text-align:center;
                            text-shadow:
                                1px 1px 2px white,
                                -1px -1px 2px white,
                                1px -1px 2px white,
                                -1px 1px 2px white;
                            white-space:nowrap;
                        ">
                            ${nama}
                            ${
                                jumlah !== undefined
                                    ? `<br>
                                       <span style="
                                           font-size:9px;
                                           color:#991b1b;
                                       ">
                                           ${jumlah} kejadian
                                       </span>`
                                    : ''
                            }
                        </div>
                    `,

                    iconSize: [120, 35],
                    iconAnchor: [60, 17]
                }),

                interactive: false
            }
        );
    }


    /* ========================================================
       12. TAHUN LAPORAN
       ======================================================== */

    function getTahunLaporan(item) {

        const nilai =
            item.tanggal ||
            item.tanggal_kejadian ||
            item.created_at ||
            item.createdAt ||
            item.waktu ||
            item.created;

        if (!nilai) {
            return null;
        }

        const tanggal =
            new Date(nilai);

        if (
            Number.isNaN(
                tanggal.getTime()
            )
        ) {
            return null;
        }

        return tanggal.getFullYear();
    }


    /* ========================================================
       13. JENIS KEJADIAN
       ======================================================== */

    function isKebakaran(item) {

        const jenis =
            String(
                item.jenis_kejadian ||
                item.jenis ||
                item.kategori ||
                ''
            ).toLowerCase();

        const judul =
            String(
                item.judul_kejadian ||
                ''
            ).toLowerCase();

        const deskripsi =
            String(
                item.deskripsi ||
                ''
            ).toLowerCase();

        return (
            jenis.includes('kebakaran') ||
            judul.includes('kebakaran') ||
            deskripsi.includes('kebakaran')
        );
    }


    /* ========================================================
       14. KOORDINAT LAPORAN
       ======================================================== */

    function getLatLngLaporan(item) {

        const lat =
            Number(
                item.latitude ??
                item.lat
            );

        const lng =
            Number(
                item.longitude ??
                item.lng
            );

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {
            return null;
        }

        return {
            lat,
            lng
        };
    }


    /* ========================================================
       15. HITUNG LAPORAN
       ======================================================== */

    function hitungLaporanDalamFeature(
        feature,
        daftarLaporan
    ) {

        const polygon =
            L.geoJSON(feature);

        let jumlah = 0;

        daftarLaporan.forEach(
            item => {

                const posisi =
                    getLatLngLaporan(item);

                if (!posisi) {
                    return;
                }

                const point =
                    L.latLng(
                        posisi.lat,
                        posisi.lng
                    );

                try {

                    if (
                        polygon
                            .getBounds()
                            .contains(point)
                    ) {
                        jumlah++;
                    }

                } catch (error) {}
            }
        );

        return jumlah;
    }


    /* ========================================================
       16. LEGENDA BERANDA
       ======================================================== */

    function setLegend(html) {

        const legend =
            document.getElementById(
                'map-theme-legend'
            );

        if (legend) {
            legend.innerHTML = html;
        }
    }


    function legendKebakaran() {

        return `
            <div class="fw-bold mb-2">
                JUMLAH KEJADIAN KEBAKARAN
            </div>

            <div class="mb-1">
                <span style="
                    display:inline-block;
                    width:24px;
                    height:16px;
                    background:#e8f5e9;
                    border:1px solid #52c41a;
                "></span>
                0 kejadian
            </div>

            <div class="mb-1">
                <span style="
                    display:inline-block;
                    width:24px;
                    height:16px;
                    background:#fff566;
                    border:1px solid #d4b106;
                "></span>
                1 kejadian
            </div>

            <div class="mb-1">
                <span style="
                    display:inline-block;
                    width:24px;
                    height:16px;
                    background:#ffa940;
                    border:1px solid #d46b08;
                "></span>
                2 kejadian
            </div>

            <div>
                <span style="
                    display:inline-block;
                    width:24px;
                    height:16px;
                    background:#ff4d4f;
                    border:1px solid #cf1322;
                "></span>
                3+ kejadian
            </div>
        `;
    }


    /* ========================================================
       17. LOAD KABUPATEN
       ======================================================== */

    try {

        dataKabupaten =
            await loadJSON(
                'data/diy-kabkota.geojson'
            );

        L.geoJSON(
            dataKabupaten,
            {
                pane: 'pane_kabupaten_boundary',
                style: {
                    color: '#1e3a8a',
                    weight: 2.8,
                    opacity: 0.95,
                    fillColor: '#bfdbfe',
                    fillOpacity: 0.08,
                    dashArray: '8, 5'
                },

                onEachFeature(
                    feature,
                    layer
                ) {
                    const nama =
                        getNamaWilayah(
                            feature.properties
                        );

                    layer.bindTooltip(
                        nama.toUpperCase(),
                        {
                            permanent: true,
                            direction: 'center',
                            className: 'kabupaten-label'
                        }
                    );

                    layer.bindPopup(`
                        <div style="min-width:180px;">
                            <strong style="color:#1e3a8a; font-size:14px;">🏛️ ${nama}</strong><br>
                            <span class="badge bg-primary" style="background:#1e3a8a!important; margin:4px 0;">Batas Kabupaten / Kota</span><br>
                            <small class="text-muted">Daerah Istimewa Yogyakarta</small>
                        </div>
                    `);
                }

            }
        ).addTo(
            kabupatenLayer
        );

    } catch (error) {

        console.error(
            'Gagal memuat batas kabupaten:',
            error
        );
    }


    /* ========================================================
       18. LOAD KECAMATAN
       ======================================================== */

    try {

        dataKecamatan =
            await loadJSON(
                'data/diy-kecamatan.geojson'
            );

        L.geoJSON(
            dataKecamatan,
            {

                style: {
                    color: '#374151',
                    weight: 1,
                    fillColor: '#dbeafe',
                    fillOpacity: 0.12
                },

                onEachFeature(
                    feature,
                    layer
                ) {

                    const nama =
                        getNamaWilayah(
                            feature.properties
                        );

                    layer.bindPopup(`
                        <strong>
                            Kecamatan ${nama}
                        </strong>
                    `);
                }

            }
        ).addTo(
            kecamatanLayer
        );

    } catch (error) {

        console.error(
            'Gagal memuat batas kecamatan:',
            error
        );
    }


    /* ========================================================
       19. TITIK DESA
       ======================================================== */

    try {

        dataDesa =
            await loadJSON(
                'data/diy-desa-titik.json'
            );

        dataDesa.forEach(
            desa => {

                const lat =
                    Number(desa.lat);

                const lng =
                    Number(desa.lng);

                if (
                    !Number.isFinite(lat) ||
                    !Number.isFinite(lng)
                ) {
                    return;
                }

                L.circleMarker(
                    [lat, lng],
                    {
                        radius: 4,
                        color: '#92400e',
                        weight: 1,
                        fillColor: '#f59e0b',
                        fillOpacity: 0.9
                    }
                )
                .bindPopup(`
                    <strong>
                        ${desa.kel_desa || 'Desa/Kelurahan'}
                    </strong>
                    <br>
                    Kecamatan:
                    ${desa.kecamatan || '-'}
                    <br>
                    Kabupaten/Kota:
                    ${desa.kab_kota || '-'}
                `)
                .addTo(
                    desaLayer
                );
            }
        );

    } catch (error) {

        console.error(
            'Gagal memuat titik desa:',
            error
        );
    }

    const publicShapefiles = [
        {
            name: 'Batas Provinsi',
            target: provinsiLayer,
            pane: 'pane_provinsi_boundary',
            paths: {
                shp: 'Shapefile & mpk/Data Peta WMK Cagar Budaya/Batas Administrasi Provinsi.shp',
                dbf: 'Shapefile & mpk/Data Peta WMK Cagar Budaya/Batas Administrasi Provinsi.dbf',
                prj: 'Shapefile & mpk/Data Peta WMK Cagar Budaya/Batas Administrasi Provinsi.prj'
            },
            style: { color: '#111827', weight: 3.5, fill: false }
        },
        {
            name: 'Batas Kecamatan/Kapanewon',
            target: kecamatanLayer,
            paths: {
                shp: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Batas Administrasi Kelurahan DIY/Administrasi_Kapanewon_AR.shp',
                dbf: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Batas Administrasi Kelurahan DIY/Administrasi_Kapanewon_AR.dbf',
                prj: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Batas Administrasi Kelurahan DIY/Administrasi_Kapanewon_AR.prj'
            },
            style: { color: '#374151', weight: 1.2, fill: false }
        },
        {
            name: 'Batas Kelurahan/Desa',
            target: desaLayer,
            paths: {
                shp: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Batas Administrasi Kelurahan DIY/Administrasi_LN.shp',
                dbf: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Batas Administrasi Kelurahan DIY/Administrasi_LN.dbf',
                prj: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Batas Administrasi Kelurahan DIY/Administrasi_LN.prj'
            },
            style: { color: '#4b5563', weight: 0.8, fill: false }
        },
        {
            name: 'Jaringan Jalan',
            target: jalanLayer,
            convertUtm: true,
            paths: {
                shp: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Jalan/Jalan.shp',
                dbf: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Jalan/Jalan.dbf',
                prj: 'Shapefile & mpk/Data Peta Jangkauan Tangki Air/Data/Jalan/Jalan.prj'
            },
            style: feature => {
                const type = String(feature.properties?.LAYER || feature.properties?.KETERANGAN || '').toLowerCase();
                return { color: type.includes('kolektor') ? '#b91c1c' : '#d97706', weight: type.includes('kolektor') ? 1.8 : 0.65, opacity: 0.8, fill: false };
            }
        }
    ];

    await Promise.all(publicShapefiles.map(async ({ name, target, paths, style, convertUtm, pane }) => {
        try {
            console.log(`[MAP] Loading: ${name}`);
            const data = await loadShapefile(paths, convertUtm);
            const options = pane ? { pane, style } : { style };
            L.geoJSON(data, options).addTo(target);
            console.log(`[MAP] Loaded: ${name}`);
        } catch (error) {
            console.error(`[MAP] ERROR: ${name}`, error);
        }
    }));


    /* ========================================================
       20. ICON POS DAMKAR (EKSISTING & RENCANA)
       ======================================================== */

    const damkarIcon =
        L.divIcon({
            className: 'damkar-map-icon',
            html: `
                <div style="
                    width:30px;
                    height:30px;
                    background:#C62828;
                    border:2.5px solid #ffffff;
                    border-radius:50%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    box-shadow:0 2px 8px rgba(0,0,0,.45);
                    font-size:15px;
                ">
                    🚒
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
        });

    const posRencanaIcon =
        L.divIcon({
            className: 'damkar-rencana-icon',
            html: `
                <div style="
                    width:30px;
                    height:30px;
                    background:#103B78;
                    border:2.5px solid #ffffff;
                    border-radius:50%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    box-shadow:0 2px 8px rgba(0,0,0,.45);
                    font-size:14px;
                ">
                    🛡️
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
        });


    /* ========================================================
       21. POS DAMKAR (EKSISTING & RENCANA)
       ======================================================== */

    try {
        const rawData =
            await loadJSON(
                'data/TITIK POS DAMKAR EKSISTING.geojson'
            );

        L.geoJSON(
            rawData,
            {
                pointToLayer(
                    feature,
                    latlng
                ) {
                    jumlahPosDamkar++;
                    const props = feature.properties || {};
                    const id = props.Id || props.ID || jumlahPosDamkar;
                    const nama = props.Nama || props.NAMA || props.nama || `Pos Damkar ${jumlahPosDamkar}`;
                    const kab = props.Kabupaten || 'Daerah Istimewa Yogyakarta';

                    const marker = L.marker(
                        latlng,
                        { icon: damkarIcon }
                    );

                    marker.bindTooltip(`🚒 ${nama}`, {
                        permanent: true,
                        direction: 'top',
                        className: 'pos-damkar-label',
                        offset: [0, -16]
                    });

                    marker.bindPopup(`
                        <div style="min-width:200px; padding:2px 0;">
                            <div style="font-size:15px; font-weight:bold; color:#C62828; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                                <span>🚒</span> <span>${nama}</span>
                            </div>
                            <div style="margin-bottom:6px;">
                                <span class="badge bg-danger" style="background:#C62828!important; font-size:11.5px; font-weight:bold; padding:4px 8px; border-radius:4px; display:inline-block;">Pos Pemadam Kebakaran Tersedia</span>
                            </div>
                            <div style="font-size:13px; color:#1f2937; margin-top:2px;">
                                <b>Wilayah:</b> ${kab}
                            </div>
                        </div>
                    `);

                    return marker;
                }
            }
        ).addTo(damkarLayer);

    } catch (error) {
        console.error('Gagal memuat Pos Damkar Eksisting:', error);
    }

    try {
        const rawRencana =
            await loadJSON(
                'data/TITIK POS DAMKAR RENCANA.geojson'
            );
        const dataRencana = convertUtmGeoJSON(rawRencana);

        L.geoJSON(
            dataRencana,
            {
                pointToLayer(
                    feature,
                    latlng
                ) {
                    jumlahPosDamkar++;
                    const props = feature.properties || {};
                    const id = props.Id || props.ID || jumlahPosDamkar;
                    const nama = props.Nama || props.NAMA || props.nama || `Pos Damkar Rencana ${jumlahPosDamkar}`;
                    const kab = props.Kabupaten || 'Daerah Istimewa Yogyakarta';

                    const marker = L.marker(
                        latlng,
                        { icon: posRencanaIcon }
                    );

                    marker.bindTooltip(`🛡️ ${nama}`, {
                        permanent: true,
                        direction: 'top',
                        className: 'pos-rencana-label',
                        offset: [0, -16]
                    });

                    marker.bindPopup(`
                        <div style="min-width:200px; padding:2px 0;">
                            <div style="font-size:15px; font-weight:bold; color:#103B78; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                                <span>🛡️</span> <span>${nama}</span>
                            </div>
                            <div style="margin-bottom:6px;">
                                <span class="badge bg-primary" style="background:#103B78!important; font-size:11.5px; font-weight:bold; padding:4px 8px; border-radius:4px; display:inline-block;">Pos Pemadam Kebakaran Rencana</span>
                            </div>
                            <div style="font-size:13px; color:#1f2937; margin-top:2px;">
                                <b>Wilayah:</b> ${kab}
                            </div>
                        </div>
                    `);

                    return marker;
                }
            }
        ).addTo(damkarLayer);

    } catch (error) {
        console.warn('Gagal memuat Pos Damkar Rencana:', error);
    }


    /* ========================================================
       22. BUFFER POS DAMKAR (JANGKAUAN LAYANAN)
       ======================================================== */

    try {
        const rawData =
            await loadJSON(
                'data/BUFFER POS DAMKAR EKSISTING.geojson'
            );

        const data = convertUtmGeoJSON(rawData);

        L.geoJSON(
            data,
            {
                style: {
                    color: '#103B78',
                    weight: 2.8,
                    opacity: 0.95,
                    fillColor: '#93C5FD',
                    fillOpacity: 0.18
                },
                onEachFeature(
                    feature,
                    layer
                ) {
                    const props = feature.properties || {};
                    const nama = props.Nama || props.NAMA || 'Pos Damkar Tersedia';
                    layer.bindPopup(`
                        <strong>🛡️ Jangkauan Layanan (${nama})</strong>
                        <br><br>
                        Radius pelayanan respons pemadaman kebakaran.
                    `);
                }
            }
        ).addTo(bufferDamkarLayer);

    } catch (error) {
        console.warn('Buffer Damkar Eksisting tidak tersedia:', error);
    }

    try {
        const rawBufferRencana =
            await loadJSON(
                'data/BUFFER POS DAMKAR RENCANA.geojson'
            );

        const dataBufferRencana = convertUtmGeoJSON(rawBufferRencana);

        L.geoJSON(
            dataBufferRencana,
            {
                style: {
                    color: '#103B78',
                    weight: 2.8,
                    dashArray: '4, 4',
                    opacity: 0.95,
                    fillColor: '#60A5FA',
                    fillOpacity: 0.16
                },
                onEachFeature(
                    feature,
                    layer
                ) {
                    const props = feature.properties || {};
                    const nama = props.Nama || props.NAMA || 'Pos Damkar Rencana';
                    layer.bindPopup(`
                        <strong>🛡️ Jangkauan Layanan Rencana (${nama})</strong>
                        <br><br>
                        Rencana perluasan radius pelayanan pemadaman.
                    `);
                }
            }
        ).addTo(bufferDamkarLayer);

    } catch (error) {
        console.warn('Buffer Damkar Rencana tidak tersedia:', error);
    }


    /* ========================================================
       23. LOAD LAPORAN
       ======================================================== */

    async function loadLaporan() {

        try {

            const response =
                await fetch(
                    '/api/laporan'
                );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const result =
                await response.json();

            dataLaporan =
                result.data ||
                result ||
                [];

            laporanLayer.clearLayers();
            nonKebakaranLayer.clearLayers();

            dataLaporan.forEach(
                item => {

                    const posisi =
                        getLatLngLaporan(
                            item
                        );

                    if (!posisi) {
                        return;
                    }

                    if (
                        isKebakaran(item)
                    ) {

                        L.circleMarker(
                            [
                                posisi.lat,
                                posisi.lng
                            ],
                            {
                                radius: 9,
                                color: '#991b1b',
                                weight: 3,
                                fillColor: '#ef4444',
                                fillOpacity: 0.95
                            }
                        )
                        .bindPopup(`
                            <strong style="
                                color:#dc2626;
                                font-size:17px;
                            ">
                                🔥 LAPORAN KEBAKARAN
                            </strong>

                            <hr>

                            <b>Lokasi:</b><br>
                            ${item.alamat || '-'}

                            <br><br>

                            <b>Jenis:</b>
                            ${item.jenis_kejadian || 'Kebakaran'}

                            <br><br>

                            <b>Status:</b>
                            ${item.status || 'Menunggu'}
                        `)
                        .addTo(
                            laporanLayer
                        );

                    } else {

                        L.circleMarker(
                            [
                                posisi.lat,
                                posisi.lng
                            ],
                            {
                                radius: 8,
                                color: '#92400e',
                                weight: 3,
                                fillColor: '#fbbf24',
                                fillOpacity: 0.95
                            }
                        )
                        .bindPopup(`
                            <strong>
                                ⚠️ NON-KEBAKARAN
                            </strong>

                            <hr>

                            <b>Lokasi:</b><br>
                            ${item.alamat || '-'}

                            <br><br>

                            <b>Jenis:</b>
                            ${item.jenis_kejadian || '-'}

                            <br><br>

                            <b>Status:</b>
                            ${item.status || 'Menunggu'}
                        `)
                        .addTo(
                            nonKebakaranLayer
                        );
                    }
                }
            );

        } catch (error) {

            console.warn(
                'Data laporan belum tersedia:',
                error
            );
        }
    }

    await loadLaporan();


    /* ========================================================
       24. PERTANIAN
       ======================================================== */

    function normalisasiNamaWilayah(
        nama
    ) {

        return String(nama || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
    }


    function getPertanianFillColor(
        namaKecamatan
    ) {

        const nama =
            normalisasiNamaWilayah(
                namaKecamatan
            );

        if (
            /depok|mlati|kalasan|prambanan|sewon|sanden|wates/.test(
                nama
            )
        ) {
            return '#15803d';
        }

        if (
            /wonosari|playen|semin|panggang|semanu/.test(
                nama
            )
        ) {
            return '#eab308';
        }

        if (
            /imogiri|dlingo|pandak|panggang/.test(
                nama
            )
        ) {
            return '#f97316';
        }

        if (
            /tempel|pakem|turi|cangkringan|girimulyo/.test(
                nama
            )
        ) {
            return '#8b0000';
        }

        if (
            /dringo|samigaluh|kulon progo|srandakan/.test(
                nama
            )
        ) {
            return '#dc2626';
        }

        return '#f87171';
    }


    function renderPertanianLayer() {

        pertanianLayer.clearLayers();

        if (!dataKecamatan) {
            return;
        }

        L.geoJSON(
            dataKecamatan,
            {

                style(feature) {

                    const nama =
                        getNamaWilayah(
                            feature.properties
                        );

                    return {
                        color: '#1f2937',
                        weight: 1,
                        fillColor:
                            getPertanianFillColor(
                                nama
                            ),
                        fillOpacity: 0.72
                    };
                },

                onEachFeature(
                    feature,
                    layer
                ) {

                    const nama =
                        getNamaWilayah(
                            feature.properties
                        );

                    layer.bindPopup(`
                        <strong>
                            ${nama}
                        </strong>
                        <br>
                        <small>
                            Peta Potensi Kebakaran
                            Lahan Pertanian
                        </small>
                    `);
                }

            }
        ).addTo(
            pertanianLayer
        );
    }

    renderPertanianLayer();


    /* ========================================================
       25. TANGKI AIR
       ======================================================== */

    function renderTangkiAirLayer() {

        tangkiAirLayer.clearLayers();

        const tangkiPoints = [

            {
                name: 'Pos Tangki Air Sleman Utama',
                lat: -7.725,
                lng: 110.355
            },

            {
                name: 'Pos Tangki Air Kota Tugu',
                lat: -7.785,
                lng: 110.366
            },

            {
                name: 'Pos Tangki Air Bantul Utara',
                lat: -7.850,
                lng: 110.340
            },

            {
                name: 'Pos Tangki Air Kulon Progo Wates',
                lat: -7.855,
                lng: 110.155
            },

            {
                name: 'Pos Tangki Air Gunungkidul Wonosari',
                lat: -7.965,
                lng: 110.605
            }

        ];

        tangkiPoints.forEach(
            point => {

                L.circleMarker(
                    [
                        point.lat,
                        point.lng
                    ],
                    {
                        radius: 8,
                        color: '#0369a1',
                        weight: 2,
                        fillColor: '#0284c7',
                        fillOpacity: 0.9
                    }
                )
                .bindPopup(
                    `<strong>
                        💧 ${point.name}
                    </strong>
                    <br>
                    Kapasitas pasokan air darurat`
                )
                .addTo(
                    tangkiAirLayer
                );

                L.circle(
                    [
                        point.lat,
                        point.lng
                    ],
                    {
                        radius: 4000,
                        color: '#0284c7',
                        weight: 1.5,
                        dashArray: '3 3',
                        fillColor: '#38bdf8',
                        fillOpacity: 0.12
                    }
                )
                .addTo(
                    tangkiAirLayer
                );
            }
        );
    }

    renderTangkiAirLayer();


    /* ========================================================
       26. CAGAR BUDAYA
       ======================================================== */

    async function renderCagarBudayaLayer() {

        cagarBudayaLayer.clearLayers();

        try {

            const rawData =
                await loadJSON(
                    'data/TITIK CAGAR BUDAYA.geojson'
                );

            const data =
                rawData;

            L.geoJSON(
                data,
                {

                    pointToLayer(
                        feature,
                        latlng
                    ) {

                        const marker =
                            L.circleMarker(
                                latlng,
                                {
                                    radius: 6,
                                    color: '#7f1d1d',
                                    weight: 2,
                                    fillColor: '#b91c1c',
                                    fillOpacity: 0.95
                                }
                            );

                        L.circle(
                            latlng,
                            {
                                radius: 4000,
                                color: '#991b1b',
                                weight: 2,
                                dashArray: '4 4',
                                fillColor: '#fca5a5',
                                fillOpacity: 0.18
                            }
                        ).addTo(
                            cagarBudayaLayer
                        );

                        return marker;
                    },

                    onEachFeature(
                        feature,
                        layer
                    ) {

                        const props =
                            feature.properties || {};

                        const nama =
                            props.NAMA ||
                            props.Nama ||
                            props.nama ||
                            'Cagar Budaya DIY';

                        layer.bindPopup(`
                            <strong>
                                🏛️ ${nama}
                            </strong>
                            <br>
                            <small>
                                Situs Cagar Budaya Dilindungi
                            </small>
                        `);
                    }

                }
            ).addTo(
                cagarBudayaLayer
            );

        } catch (error) {

            console.warn(
                'Gagal memuat layer cagar budaya:',
                error
            );
        }
    }

    await renderCagarBudayaLayer();


    /* ========================================================
       27. SRS (SATUAN RUANG STRATEGIS)
       ======================================================== */

    const SRS_PALETTE = {
        'candi prambanan': { fill: '#D7C7EB', stroke: '#8A63D2', label: 'SRS Candi Prambanan – Candi Ijo' },
        'prambanan': { fill: '#D7C7EB', stroke: '#8A63D2', label: 'SRS Candi Prambanan – Candi Ijo' },
        'merapi': { fill: '#C8E6A6', stroke: '#6FA832', label: 'SRS Gunung Merapi' },
        'karaton': { fill: '#F6EAAD', stroke: '#9E9346', label: 'SRS Karaton' },
        'kraton': { fill: '#F6EAAD', stroke: '#9E9346', label: 'SRS Karaton' },
        'gunungsewu': { fill: '#AEE5EE', stroke: '#38A3B8', label: 'SRS Karst Gunungsewu' },
        'gunung sewu': { fill: '#AEE5EE', stroke: '#38A3B8', label: 'SRS Karst Gunungsewu' },
        'karst': { fill: '#AEE5EE', stroke: '#38A3B8', label: 'SRS Karst Gunungsewu' },
        'kerto': { fill: '#F3A8A8', stroke: '#D15353', label: 'SRS Kerto - Pleret' },
        'pleret': { fill: '#F3A8A8', stroke: '#D15353', label: 'SRS Kerto - Pleret' },
        'kotabaru': { fill: '#A4DFD1', stroke: '#3EA38A', label: 'SRS Kotabaru' },
        'girigondo': { fill: '#A8BAEE', stroke: '#5777D9', label: 'SRS Makam Girigondo' },
        'imogiri': { fill: '#9496E8', stroke: '#4A4ED1', label: 'SRS Makam Raja-Raja Mataram di Imogiri' },
        'pathok negoro': { fill: '#EE6EDE', stroke: '#B823A4', label: 'SRS Masjid Pathok Negoro' },
        'pathoknegoro': { fill: '#EE6EDE', stroke: '#B823A4', label: 'SRS Masjid Pathok Negoro' },
        'pathok': { fill: '#EE6EDE', stroke: '#B823A4', label: 'SRS Masjid Pathok Negoro' },
        'kotagede': { fill: '#78DF94', stroke: '#2BA34D', label: 'SRS Masjid dan Makam Raja Mataram di Kotagede' },
        'samas': { fill: '#DDD177', stroke: '#A39423', label: 'SRS Pantai Samas – Parangtritis' },
        'parangtritis': { fill: '#DDD177', stroke: '#A39423', label: 'SRS Pantai Samas – Parangtritis' },
        'pantai selatan gunungkidul': { fill: '#B8CEE0', stroke: '#527E9F', label: 'SRS Pantai Selatan Gunungkidul' },
        'gunungkidul': { fill: '#B8CEE0', stroke: '#527E9F', label: 'SRS Pantai Selatan Gunungkidul' },
        'pantai selatan kulon progo': { fill: '#F3BEB2', stroke: '#D86550', label: 'SRS Pantai Selatan Kulon Progo' },
        'kulon progo': { fill: '#F3BEB2', stroke: '#D86550', label: 'SRS Pantai Selatan Kulon Progo' },
        'menoreh': { fill: '#F7D4BF', stroke: '#D98858', label: 'SRS Perbukitan Menoreh' },
        'pakualaman': { fill: '#A0E878', stroke: '#52B31E', label: 'SRS Puro Pakualaman' },
        'wates': { fill: '#EA72AD', stroke: '#C42777', label: 'SRS Pusat Kota Wates' },
        'sokoliman': { fill: '#E4D3BD', stroke: '#A88E6B', label: 'SRS Sokoliman' },
        'sumbu filosofi': { fill: '#FFEE44', stroke: '#D4B800', label: 'SRS Sumbu Filosofi Tugu Pal Putih - Panggung Krapyak' },
        'sumbu': { fill: '#FFEE44', stroke: '#D4B800', label: 'SRS Sumbu Filosofi Tugu Pal Putih - Panggung Krapyak' },
        'tugu': { fill: '#FFEE44', stroke: '#D4B800', label: 'SRS Sumbu Filosofi Tugu Pal Putih - Panggung Krapyak' }
    };

    function getSrsStyle(name, feature) {
        const props = (feature && feature.properties) ? feature.properties : {};
        const raw = (
            String(name || '') + ' ' +
            String(props.REMARK || '') + ' ' +
            String(props.SRS_EDIT || '') + ' ' +
            String(props.SRS_FIX || '') + ' ' +
            String(props.NAMOBJ || '') + ' ' +
            String(props.nama || '')
        ).toLowerCase();

        if (raw.includes('gunungkidul')) return { color: '#527E9F', weight: 1.5, opacity: 1, fillColor: '#B8CEE0', fillOpacity: 0.85 };
        if (raw.includes('kulon progo') || raw.includes('kulonprogo') || (raw.includes('pantai') && raw.includes('kulon'))) return { color: '#D86550', weight: 1.5, opacity: 1, fillColor: '#F3BEB2', fillOpacity: 0.85 };
        if (raw.includes('samas') || raw.includes('parangtritis')) return { color: '#A39423', weight: 1.5, opacity: 1, fillColor: '#DDD177', fillOpacity: 0.85 };
        if (raw.includes('prambanan') || raw.includes('ijo')) return { color: '#8A63D2', weight: 1.5, opacity: 1, fillColor: '#D7C7EB', fillOpacity: 0.85 };
        if (raw.includes('merapi')) return { color: '#6FA832', weight: 1.5, opacity: 1, fillColor: '#C8E6A6', fillOpacity: 0.85 };
        if (raw.includes('karaton') || raw.includes('kraton')) return { color: '#9E9346', weight: 1.5, opacity: 1, fillColor: '#F6EAAD', fillOpacity: 0.85 };
        if (raw.includes('gunungsewu') || raw.includes('gunung sewu') || raw.includes('karst')) return { color: '#38A3B8', weight: 1.5, opacity: 1, fillColor: '#AEE5EE', fillOpacity: 0.85 };
        if (raw.includes('kerto') || raw.includes('pleret')) return { color: '#D15353', weight: 1.5, opacity: 1, fillColor: '#F3A8A8', fillOpacity: 0.85 };
        if (raw.includes('kotabaru')) return { color: '#3EA38A', weight: 1.5, opacity: 1, fillColor: '#A4DFD1', fillOpacity: 0.85 };
        if (raw.includes('girigondo')) return { color: '#5777D9', weight: 1.5, opacity: 1, fillColor: '#A8BAEE', fillOpacity: 0.85 };
        if (raw.includes('imogiri')) return { color: '#4A4ED1', weight: 1.5, opacity: 1, fillColor: '#9496E8', fillOpacity: 0.85 };
        if (raw.includes('pathok')) return { color: '#B823A4', weight: 1.5, opacity: 1, fillColor: '#EE6EDE', fillOpacity: 0.85 };
        if (raw.includes('kotagede')) return { color: '#2BA34D', weight: 1.5, opacity: 1, fillColor: '#78DF94', fillOpacity: 0.85 };
        if (raw.includes('menoreh')) return { color: '#D98858', weight: 1.5, opacity: 1, fillColor: '#F7D4BF', fillOpacity: 0.85 };
        if (raw.includes('pakualaman')) return { color: '#52B31E', weight: 1.5, opacity: 1, fillColor: '#A0E878', fillOpacity: 0.85 };
        if (raw.includes('wates')) return { color: '#C42777', weight: 1.5, opacity: 1, fillColor: '#EA72AD', fillOpacity: 0.85 };
        if (raw.includes('sokoliman')) return { color: '#A88E6B', weight: 1.5, opacity: 1, fillColor: '#E4D3BD', fillOpacity: 0.85 };
        if (raw.includes('sumbu') || raw.includes('filosofi') || raw.includes('tugu') || raw.includes('krapyak')) return { color: '#D4B800', weight: 2.2, opacity: 1, fillColor: '#FFEE44', fillOpacity: 0.90 };

        return { color: '#9E9346', weight: 1.5, opacity: 1, fillColor: '#F6EAAD', fillOpacity: 0.80 };
    }

    async function renderSrsLayer() {

        srsLayer.clearLayers();

        try {

            const rawData =
                await loadJSON(
                    'data/AREA SRS.geojson'
                );

            L.geoJSON(
                rawData,
                {

                    style(feature) {
                        const props = feature.properties || {};
                        const name = props.REMARK || props.SRS_EDIT || props.SRS_FIX || props.NAMOBJ || '';
                        return getSrsStyle(name, feature);
                    },

                    onEachFeature(
                        feature,
                        layer
                    ) {

                        const props =
                            feature.properties || {};

                        const name =
                            props.REMARK ||
                            props.SRS_EDIT ||
                            props.SRS_FIX ||
                            props.NAMOBJ ||
                            'Kawasan SRS DIY';

                        layer.bindPopup(`
                            <strong>
                                Satuan Ruang Strategis (SRS)
                            </strong>
                            <br>
                            ${name}
                        `);
                    }

                }
            ).addTo(
                srsLayer
            );

        } catch (error) {

            console.warn(
                'Gagal memuat layer SRS:',
                error
            );
        }
    }

    await renderSrsLayer();


    /* ========================================================
       28. SUMBU FILOSOFIS
       ======================================================== */

    function renderFilosofisLayer() {

        sumbuFilosofisLayer.clearLayers();

        L.polygon(
            [
                [-7.780, 110.355],
                [-7.780, 110.373],
                [-7.832, 110.369],
                [-7.832, 110.351]
            ],
            {
                color: '#818cf8',
                weight: 3,
                dashArray: '4 4',
                fillColor: '#c7d2fe',
                fillOpacity: 0.35
            }
        )
        .bindPopup(
            '<strong>Buffer Zone Sumbu Filosofi</strong><br>Kawasan Penyangga Warisan Budaya World Heritage'
        )
        .addTo(
            sumbuFilosofisLayer
        );


        L.polygon(
            [
                [-7.802, 110.360],
                [-7.802, 110.368],
                [-7.809, 110.368],
                [-7.809, 110.360]
            ],
            {
                color: '#dc2626',
                weight: 3,
                fillColor: '#fef08a',
                fillOpacity: 0.85
            }
        )
        .bindPopup(
            '<strong>Area Kraton Yogyakarta</strong><br>Kawasan Utama Istana Kraton'
        )
        .addTo(
            sumbuFilosofisLayer
        );


        L.polygon(
            [
                [-7.794, 110.365],
                [-7.794, 110.368],
                [-7.797, 110.368],
                [-7.797, 110.365]
            ],
            {
                color: '#0f766e',
                weight: 3,
                fillColor: '#2dd4bf',
                fillOpacity: 0.85
            }
        )
        .bindPopup(
            '<strong>Area Kepatihan</strong><br>Pusat Pemerintahan Gubernur DIY'
        )
        .addTo(
            sumbuFilosofisLayer
        );


        L.polygon(
            [
                [-7.809, 110.358],
                [-7.809, 110.363],
                [-7.813, 110.363],
                [-7.813, 110.358]
            ],
            {
                color: '#d97706',
                weight: 3,
                fillColor: '#f59e0b',
                fillOpacity: 0.85
            }
        )
        .bindPopup(
            '<strong>Area Taman Sari</strong><br>Situs Taman Air Cagar Budaya'
        )
        .addTo(
            sumbuFilosofisLayer
        );


        L.polygon(
            [
                [-7.803, 110.362],
                [-7.803, 110.364],
                [-7.805, 110.364],
                [-7.805, 110.362]
            ],
            {
                color: '#991b1b',
                weight: 3,
                fillColor: '#dc2626',
                fillOpacity: 0.9
            }
        )
        .bindPopup(
            '<strong>Area Masjid Gede Kauman</strong><br>Masjid Agung Kagungan Dalem'
        )
        .addTo(
            sumbuFilosofisLayer
        );


        L.polyline(
            [
                [-7.8276, 110.3606],
                [-7.8053, 110.3642],
                [-7.7829, 110.3671]
            ],
            {
                color: '#dc2626',
                weight: 7,
                opacity: 0.95
            }
        )
        .bindPopup(
            '<strong>Poros Kosmologi Sumbu Filosofis</strong><br>Panggung Krapyak - Kraton Yogyakarta - Tugu Golong Gilig'
        )
        .addTo(
            sumbuFilosofisLayer
        );
    }

    renderFilosofisLayer();


    /* ========================================================
       29. PETA TEMATIK KEBAKARAN
       ======================================================== */

    function tampilkanPetaKebakaran() {

        kebakaranTematikLayer.clearLayers();

        if (!dataKecamatan) {
            return;
        }

        let laporanKebakaran =
            dataLaporan.filter(
                item =>
                    isKebakaran(item)
            );

        const laporan2024 =
            laporanKebakaran.filter(
                item =>
                    getTahunLaporan(item) === 2024
            );

        if (
            laporan2024.length > 0
        ) {
            laporanKebakaran =
                laporan2024;
        }


        dataKecamatan.features.forEach(
            feature => {

                const jumlah =
                    hitungLaporanDalamFeature(
                        feature,
                        laporanKebakaran
                    );

                const nama =
                    getNamaWilayah(
                        feature.properties
                    );

                const polygon =
                    L.geoJSON(
                        feature,
                        {

                            style: {

                                color: '#222',

                                weight: 1,

                                fillColor:
                                    warnaKebakaran(
                                        jumlah
                                    ),

                                fillOpacity: 0.82
                            },

                            onEachFeature(
                                feature,
                                layer
                            ) {

                                layer.bindPopup(`
                                    <div style="
                                        min-width:220px;
                                    ">

                                        <strong>
                                            📊 ${nama}
                                        </strong>

                                        <hr>

                                        <b>
                                            Jumlah Kejadian Kebakaran:
                                        </b>

                                        <div style="
                                            font-size:28px;
                                            font-weight:bold;
                                            color:#dc2626;
                                            margin:5px 0;
                                        ">
                                            ${jumlah}
                                        </div>

                                        <b>Kategori:</b><br>
                                        ${kategoriKebakaran(jumlah)}

                                        <hr>

                                        <small>
                                            Data kejadian kebakaran
                                            berdasarkan laporan sistem.
                                        </small>

                                    </div>
                                `);

                                layer.on(
                                    'mouseover',
                                    function() {

                                        this.setStyle({
                                            weight: 3,
                                            color: '#000'
                                        });
                                    }
                                );

                                layer.on(
                                    'mouseout',
                                    function() {

                                        this.setStyle({
                                            weight: 1,
                                            color: '#222'
                                        });
                                    }
                                );
                            }

                        }
                    );

                kebakaranTematikLayer.addLayer(
                    polygon
                );


                const label =
                    buatLabelWilayah(
                        feature,
                        jumlah
                    );

                if (label) {

                    kebakaranTematikLayer
                        .addLayer(label);
                }
            }
        );


        laporanKebakaran.forEach(
            item => {

                const posisi =
                    getLatLngLaporan(
                        item
                    );

                if (!posisi) {
                    return;
                }

                const marker =
                    L.circleMarker(
                        [
                            posisi.lat,
                            posisi.lng
                        ],
                        {
                            radius: 7,
                            color: '#7f1d1d',
                            weight: 2,
                            fillColor: '#ef4444',
                            fillOpacity: 1
                        }
                    )
                    .bindPopup(`
                        <strong style="
                            color:#dc2626;
                        ">
                            🔥 TITIK KEBAKARAN
                        </strong>

                        <hr>

                        <b>Lokasi:</b><br>
                        ${item.alamat || '-'}

                        <br><br>

                        <b>Status:</b>
                        ${item.status || 'Menunggu'}
                    `);

                kebakaranTematikLayer.addLayer(
                    marker
                );
            }
        );


        setLegend(
            legendKebakaran()
        );
    }


    /* ========================================================
       30. PETA NON-KEBAKARAN
       ======================================================== */

    function tampilkanPetaNonKebakaran() {

        nonKebakaranTematikLayer
            .clearLayers();

        if (!dataKecamatan) {
            return;
        }

        const laporanNon =
            dataLaporan.filter(
                item =>
                    !isKebakaran(item)
            );


        dataKecamatan.features.forEach(
            feature => {

                const jumlah =
                    hitungLaporanDalamFeature(
                        feature,
                        laporanNon
                    );

                const nama =
                    getNamaWilayah(
                        feature.properties
                    );

                let warna =
                    '#f3f4f6';

                if (jumlah === 1) {
                    warna = '#fde68a';
                }

                if (jumlah === 2) {
                    warna = '#fbbf24';
                }

                if (jumlah >= 3) {
                    warna = '#f97316';
                }


                const polygon =
                    L.geoJSON(
                        feature,
                        {

                            style: {

                                color: '#374151',
                                weight: 1,
                                fillColor: warna,
                                fillOpacity: 0.8
                            },

                            onEachFeature(
                                feature,
                                layer
                            ) {

                                layer.bindPopup(`
                                    <strong>
                                        ⚠️ ${nama}
                                    </strong>

                                    <hr>

                                    Jumlah kejadian
                                    non-kebakaran:

                                    <div style="
                                        font-size:26px;
                                        font-weight:bold;
                                        color:#d97706;
                                    ">
                                        ${jumlah}
                                    </div>
                                `);
                            }

                        }
                    );

                nonKebakaranTematikLayer
                    .addLayer(polygon);


                const label =
                    buatLabelWilayah(
                        feature,
                        jumlah
                    );

                if (label) {

                    nonKebakaranTematikLayer
                        .addLayer(label);
                }
            }
        );


        laporanNon.forEach(
            item => {

                const posisi =
                    getLatLngLaporan(
                        item
                    );

                if (!posisi) {
                    return;
                }

                L.circleMarker(
                    [
                        posisi.lat,
                        posisi.lng
                    ],
                    {
                        radius: 7,
                        color: '#92400e',
                        weight: 2,
                        fillColor: '#fbbf24',
                        fillOpacity: 1
                    }
                )
                .bindPopup(`
                    <strong>
                        ⚠️ NON-KEBAKARAN
                    </strong>

                    <hr>

                    <b>Lokasi:</b><br>
                    ${item.alamat || '-'}

                    <br><br>

                    <b>Jenis:</b>
                    ${item.jenis_kejadian || '-'}

                    <br><br>

                    <b>Status:</b>
                    ${item.status || 'Menunggu'}
                `)
                .addTo(
                    nonKebakaranTematikLayer
                );
            }
        );


        setLegend(`
            <div class="fw-bold mb-2">
                JUMLAH KEJADIAN NON-KEBAKARAN
            </div>

            <div class="mb-1">
                <span style="
                    display:inline-block;
                    width:24px;
                    height:16px;
                    background:#f3f4f6;
                    border:1px solid #999;
                "></span>
                0 kejadian
            </div>

            <div class="mb-1">
                <span style="
                    display:inline-block;
                    width:24px;
                    height:16px;
                    background:#fde68a;
                "></span>
                1 kejadian
            </div>

            <div class="mb-1">
                <span style="
                    display:inline-block;
                    width:24px;
                    height:16px;
                    background:#fbbf24;
                "></span>
                2 kejadian
            </div>

            <div>
                <span style="
                    display:inline-block;
                    width:24px;
                    height:16px;
                    background:#f97316;
                "></span>
                3+ kejadian
            </div>

            <hr>

            <b>⚠️</b>
            Titik kejadian non-kebakaran
        `);
    }


    /* ========================================================
       31. SEMBUNYIKAN LAYER
       ======================================================== */

    function sembunyikanSemuaLayer() {

        [
            provinsiLayer,
            kabupatenLayer,
            kecamatanLayer,
            desaLayer,
            jalanLayer,
            damkarLayer,
            bufferDamkarLayer,
            laporanLayer,
            nonKebakaranLayer,
            pertanianLayer,
            tangkiAirLayer,
            srsLayer,
            cagarBudayaLayer,
            sumbuFilosofisLayer,
            kebakaranTematikLayer,
            nonKebakaranTematikLayer

        ].forEach(
            layer => {

                if (map.hasLayer(layer)) {
                    map.removeLayer(layer);
                }
            }
        );
    }


    /* ========================================================
       32. STATUS BERANDA
       ======================================================== */

    function setMapStatus(text) {

        const status =
            document.getElementById(
                'map-beranda-status'
            );

        if (status) {
            status.textContent = text;
        }
    }


    /* ========================================================
       33. TAMPILKAN THEME BERANDA
       ======================================================== */

    function tampilkanTheme(theme) {

        sembunyikanSemuaLayer();

        // Batas Provinsi & Batas Kabupaten/Kota selalu ditampilkan
        // sebagai referensi wilayah utama yang bersih.
        provinsiLayer.addTo(map);
        kabupatenLayer.addTo(map);

        // Reset check status sakelar overlay tambahan
        const cbJalan = document.getElementById('cb-overlay-jalan');
        const cbKecamatan = document.getElementById('cb-overlay-kecamatan');
        const cbSrs = document.getElementById('cb-overlay-srs');

        if (cbJalan) cbJalan.checked = false;
        if (cbKecamatan) cbKecamatan.checked = false;
        if (cbSrs) cbSrs.checked = false;


        if (theme === 'dasar') {

            kecamatanLayer.addTo(map);
            jalanLayer.addTo(map);

            if (cbJalan) cbJalan.checked = true;
            if (cbKecamatan) cbKecamatan.checked = true;

            setMapStatus(
                'Peta Dasar DIY'
            );

            setLegend(`
                <div class="fw-bold mb-2">
                    LEGENDA PETA DASAR
                </div>

                <div class="mb-2">
                    <span style="
                        display:inline-block;
                        width:24px;
                        height:3px;
                        background:#1e3a8a;
                    "></span>
                    Batas Kabupaten/Kota
                </div>

                <div>
                    <span style="
                        display:inline-block;
                        width:24px;
                        height:2px;
                        background:#374151;
                    "></span>
                    Batas Kecamatan
                </div>
            `);

            return;
        }


        if (theme === 'kebakaran') {

            tampilkanPetaKebakaran();

            kebakaranTematikLayer
                .addTo(map);

            setMapStatus(
                'Peta Jumlah Kejadian Kebakaran'
            );

            setLegend(`
                <div class="fw-bold mb-2">KEJADIAN KEBAKARAN</div>
                <div class="mb-1"><span style="color:#ff4d4f; font-size:14px;">■</span> &ge; 3 Kejadian (Tinggi)</div>
                <div class="mb-1"><span style="color:#ffa940; font-size:14px;">■</span> 2 Kejadian (Sedang)</div>
                <div class="mb-1"><span style="color:#fff566; font-size:14px;">■</span> 1 Kejadian (Rendah)</div>
                <div class="mb-1"><span style="color:#e8f5e9; font-size:14px;">■</span> 0 Kejadian (Aman)</div>
            `);

            return;
        }


        if (theme === 'non-kebakaran') {

            tampilkanPetaNonKebakaran();

            nonKebakaranTematikLayer
                .addTo(map);

            setMapStatus(
                'Peta Kejadian Non-Kebakaran'
            );

            setLegend(`
                <div class="fw-bold mb-2">KEJADIAN NON-KEBAKARAN</div>
                <div class="mb-1"><span style="color:#f97316; font-size:14px;">■</span> &ge; 3 Kejadian</div>
                <div class="mb-1"><span style="color:#fbbf24; font-size:14px;">■</span> 2 Kejadian</div>
                <div class="mb-1"><span style="color:#fde68a; font-size:14px;">■</span> 1 Kejadian</div>
                <div class="mb-1"><span style="color:#f3f4f6; font-size:14px;">■</span> 0 Kejadian</div>
            `);

            return;
        }


        if (theme === 'pertanian') {

            pertanianLayer.addTo(map);

            setMapStatus(
                'Risiko Kebakaran Pertanian'
            );

            setLegend(`
                <div class="fw-bold mb-2">RISIKO KEBAKARAN PERTANIAN</div>
                <div class="mb-1"><span style="color:#ff4d4f; font-size:14px;">■</span> Sangat Tinggi</div>
                <div class="mb-1"><span style="color:#ff7a45; font-size:14px;">■</span> Tinggi</div>
                <div class="mb-1"><span style="color:#ffc53d; font-size:14px;">■</span> Sedang</div>
                <div class="mb-1"><span style="color:#73d13d; font-size:14px;">■</span> Rendah</div>
            `);

            return;
        }


        if (theme === 'live-damkar') {

            bufferDamkarLayer.addTo(map);
            damkarLayer.addTo(map);
            laporanLayer.addTo(map);

            setMapStatus(
                'Peta Live Damkar & Jangkauan'
            );

            setLegend(`
                <div class="fw-bold mb-2 text-danger">🔥 PETA LIVE DAMKAR & JANGKAUAN</div>
                <div class="mb-1"><span style="color:#C62828; font-size:16px;">🚒</span> <b>Pos Pemadam Kebakaran Tersedia</b></div>
                <div class="mb-1"><span style="color:#103B78; font-size:16px;">🛡️</span> <b>Pos Pemadam Kebakaran Rencana</b></div>
                <div class="mb-2"><span style="display:inline-block; width:18px; height:10px; border:2.5px solid #103B78; background:rgba(147,197,253,0.25);"></span> <b>Jangkauan Layanan</b></div>
                <div class="mb-1"><span style="color:#ef4444; font-size:16px;">🔴</span> <b>Laporan Kejadian Live</b></div>
            `);

            return;
        }


        if (theme === 'wmk') {

            bufferDamkarLayer.addTo(map);
            damkarLayer.addTo(map);

            setMapStatus(
                'WMK & Pos Damkar'
            );

            setLegend(`
                <div class="fw-bold mb-2">WILAYAH MANAJEMEN KEBAKARAN</div>
                <div class="mb-1"><span style="color:#C62828; font-size:16px;">●</span> <b>Pos Pemadam Tersedia</b></div>
                <div class="mb-1"><span style="color:#103B78; font-size:16px;">●</span> <b>Pos Pemadam Rencana</b></div>
                <div class="mb-2"><span style="display:inline-block; width:18px; height:10px; border:2.5px solid #103B78; background:rgba(147,197,253,0.25);"></span> <b>Jangkauan Layanan Pos</b></div>
                <hr class="my-1">
                <small class="text-muted">Total Pos: ${jumlahPosDamkar}</small>
            `);

            return;
        }


        if (theme === 'tangki-air') {

            tangkiAirLayer.addTo(map);

            setMapStatus(
                'Jangkauan Tangki Air'
            );

            setLegend(`
                <div class="fw-bold mb-2">JANGKAUAN TANGKI AIR</div>
                <div class="mb-1"><span style="color:#0284c7; font-size:14px;">●</span> Lokasi Tangki Air</div>
                <div class="mb-1"><span style="display:inline-block; width:16px; height:10px; border:2px solid #0284c7; background:rgba(14,165,233,0.2);"></span> Jangkauan Distribusi</div>
            `);

            return;
        }


        if (theme === 'wmk-cagar') {

            cagarBudayaLayer.addTo(map);
            bufferDamkarLayer.addTo(map);
            damkarLayer.addTo(map);

            setMapStatus(
                'WMK Cagar Budaya'
            );

            setLegend(`
                <div class="fw-bold mb-2">WMK & CAGAR BUDAYA</div>
                <div class="mb-1"><span style="color:#C62828; font-size:14px;">●</span> Pos Damkar Tersedia</div>
                <div class="mb-1"><span style="color:#103B78; font-size:14px;">●</span> Pos Damkar Rencana</div>
                <div class="mb-2"><span style="display:inline-block; width:16px; height:8px; border:2px solid #103B78; background:rgba(147,197,253,0.25);"></span> Jangkauan Layanan</div>
                <hr class="my-1">
                <div class="fw-bold mb-1">Cagar Budaya</div>
                <div><span style="color:#8D6E63">●</span> Bangunan</div>
                <div><span style="color:#9C27B0">●</span> Benda</div>
                <div><span style="color:#2E7D32">●</span> Kawasan</div>
                <div><span style="color:#E65100">●</span> Situs</div>
                <div><span style="color:#00838F">●</span> Struktur</div>
            `);

            return;
        }


        if (theme === 'filosofis') {

            sumbuFilosofisLayer.addTo(map);

            setMapStatus(
                'Sumbu Filosofis DIY'
            );

            setLegend(`
                <div class="fw-bold mb-2">SUMBU FILOSOFIS DIY</div>
                <div class="mb-1"><span style="color:#b91c1c; font-size:18px;">━</span> Sumbu Filosofis</div>
            `);

            return;
        }


        if (theme === 'srs') {
            srsLayer.addTo(map);
            bufferDamkarLayer.addTo(map);
            damkarLayer.addTo(map);
            cagarBudayaLayer.addTo(map);
            kecamatanLayer.addTo(map);
            desaLayer.addTo(map);

            if (cbSrs) cbSrs.checked = true;

            setMapStatus(
                'Peta Jangkauan Pelayanan Pos Damkar DIY (SRS)'
            );

            setLegend(`
                <div class="fw-bold mb-2 text-danger" style="font-size:12.5px;">PETA JANGKAUAN PELAYANAN POS DAMKAR DIY (SRS)</div>
                <div class="text-muted small mb-2">BPBD DIY 2026 &bull; Skala 1:500.000</div>
                <hr class="my-1">

                <div class="fw-bold text-secondary text-uppercase mb-1" style="font-size:11px;">Wilayah Manajemen Kebakaran</div>
                <div class="mb-1"><span style="font-size:14px; margin-right:4px;">🛡️</span> Pos Pemadam Kebakaran Rencana</div>
                <div class="mb-1"><span style="display:inline-block; width:15px; height:10px; border:2px solid #103B78; background:rgba(147,197,253,0.3); border-radius:2px; margin-right:4px;"></span> Jangkauan Layanan</div>
                <div class="mb-2"><span style="font-size:14px; margin-right:4px;">🚒</span> Pos Pemadam Kebakaran Tersedia</div>

                <div class="fw-bold text-secondary text-uppercase mb-1" style="font-size:11px;">Kategori Risiko Kebakaran</div>
                <div class="mb-1"><span class="srs-risk-pattern srs-risk-very-heavy me-1"></span> <b class="text-danger">Sangat Berat</b></div>
                <div class="mb-2"><span class="srs-risk-pattern srs-risk-heavy me-1"></span> <b class="text-danger">Berat</b></div>

                <div class="fw-bold text-secondary text-uppercase mb-1" style="font-size:11px;">Cagar Budaya</div>
                <div class="mb-1"><span style="color:#8D6E63">●</span> Bangunan &bull; <span style="color:#9C27B0">●</span> Benda &bull; <span style="color:#2E7D32">●</span> Kawasan &bull; <span style="color:#E65100">●</span> Situs &bull; <span style="color:#00838F">●</span> Struktur</div>

                <div class="fw-bold text-secondary text-uppercase mt-2 mb-1" style="font-size:11px;">Satuan Ruang Strategis (18 Kawasan)</div>
                <div style="max-height:180px; overflow-y:auto; font-size:10.5px; line-height:1.35; padding-right:4px;">
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#D7C7EB;border:1px solid #8A63D2;border-radius:2px;margin-right:4px;"></span> SRS Candi Prambanan – Candi Ijo</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#C8E6A6;border:1px solid #6FA832;border-radius:2px;margin-right:4px;"></span> SRS Gunung Merapi</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#F6EAAD;border:1px solid #9E9346;border-radius:2px;margin-right:4px;"></span> SRS Karaton</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#AEE5EE;border:1px solid #38A3B8;border-radius:2px;margin-right:4px;"></span> SRS Karst Gunungsewu</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#F3A8A8;border:1px solid #D15353;border-radius:2px;margin-right:4px;"></span> SRS Kerto - Pleret</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#A4DFD1;border:1px solid #3EA38A;border-radius:2px;margin-right:4px;"></span> SRS Kotabaru</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#A8BAEE;border:1px solid #5777D9;border-radius:2px;margin-right:4px;"></span> SRS Makam Girigondo</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#9496E8;border:1px solid #4A4ED1;border-radius:2px;margin-right:4px;"></span> SRS Makam Raja-Raja Mataram di Imogiri</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#EE6EDE;border:1px solid #B823A4;border-radius:2px;margin-right:4px;"></span> SRS Masjid Pathok Negoro</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#78DF94;border:1px solid #2BA34D;border-radius:2px;margin-right:4px;"></span> SRS Masjid dan Makam Raja Mataram di Kotagede</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#DDD177;border:1px solid #A39423;border-radius:2px;margin-right:4px;"></span> SRS Pantai Samas – Parangtritis</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#B8CEE0;border:1px solid #527E9F;border-radius:2px;margin-right:4px;"></span> SRS Pantai Selatan Gunungkidul</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#F3BEB2;border:1px solid #D86550;border-radius:2px;margin-right:4px;"></span> SRS Pantai Selatan Kulon Progo</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#F7D4BF;border:1px solid #D98858;border-radius:2px;margin-right:4px;"></span> SRS Perbukitan Menoreh</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#A0E878;border:1px solid #52B31E;border-radius:2px;margin-right:4px;"></span> SRS Puro Pakualaman</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#EA72AD;border:1px solid #C42777;border-radius:2px;margin-right:4px;"></span> SRS Pusat Kota Wates</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#E4D3BD;border:1px solid #A88E6B;border-radius:2px;margin-right:4px;"></span> SRS Sokoliman</div>
                    <div class="mb-1"><span style="display:inline-block;width:11px;height:11px;background:#FFEE44;border:1px solid #D4B800;border-radius:2px;margin-right:4px;"></span> SRS Sumbu Filosofi Tugu Pal Putih - Panggung Krapyak</div>
                </div>

                <div class="fw-bold text-secondary text-uppercase mt-2 mb-1" style="font-size:11px;">Batas Administrasi</div>
                <div class="mb-1"><span style="font-weight:900; color:#111827;">- - -</span> Batas Provinsi</div>
                <div class="mb-1"><span style="font-weight:900; color:#1e3a8a;">- · - ·</span> Batas Kabupaten</div>
                <div class="mb-1"><span style="font-weight:900; color:#4b5563;">······</span> Batas Kelurahan/Desa</div>
            `);

            return;
        }


        if (theme === 'batas-kabupaten') {

            setMapStatus(
                'Batas Kabupaten/Kota'
            );

            setLegend(`
                <div class="fw-bold mb-2">BATAS KABUPATEN/KOTA</div>
                <div class="mb-1"><span style="color:#1e3a8a; font-size:18px;">━</span> Batas Kabupaten/Kota</div>
            `);

            return;
        }


        if (theme === 'batas-kecamatan') {

            kecamatanLayer.addTo(map);
            if (cbKecamatan) cbKecamatan.checked = true;

            setMapStatus(
                'Batas Kecamatan'
            );

            setLegend(`
                <div class="fw-bold mb-2">BATAS KECAMATAN</div>
                <div class="mb-1"><span style="color:#374151; font-size:18px;">━</span> Batas Kecamatan</div>
            `);

            return;
        }


        if (theme === 'desa') {

            desaLayer.addTo(map);

            setMapStatus(
                'Titik Desa/Kelurahan'
            );

            setLegend(`
                <div class="fw-bold mb-2">TITIK DESA/KELURAHAN</div>
                <div class="mb-1"><span style="color:#eab308; font-size:16px;">●</span> Titik Desa/Kelurahan</div>
            `);

            return;
        }


        if (theme === 'pos-damkar') {

            bufferDamkarLayer.addTo(map);
            damkarLayer.addTo(map);

            setMapStatus(
                'Pos Damkar'
            );

            setLegend(`
                <div class="fw-bold mb-2">POS PEMADAM KEBAKARAN</div>
                <div class="mb-1"><span style="color:#C62828; font-size:16px;">●</span> <b>Pos Tersedia (Eksisting)</b></div>
                <div class="mb-1"><span style="color:#103B78; font-size:16px;">●</span> <b>Pos Rencana</b></div>
                <div class="mb-2"><span style="display:inline-block; width:18px; height:10px; border:2.5px solid #103B78; background:rgba(147,197,253,0.25);"></span> <b>Jangkauan Layanan (Buffer)</b></div>
                <hr class="my-1">
                <small class="text-muted">Total: ${jumlahPosDamkar} Pos</small>
            `);

            return;
        }
    }


    /* ========================================================
       34. TOMBOL PETA BERANDA
       ======================================================== */

    const themeButtons =
        document.querySelectorAll(
            '#map-beranda-theme-buttons [data-map-theme]'
        );


    themeButtons.forEach(
        button => {

            button.addEventListener(
                'click',
                function() {

                    const theme =
                        this.dataset.mapTheme;

                    themeButtons.forEach(
                        btn => {

                            btn.classList.remove(
                                'active'
                            );
                        }
                    );

                    this.classList.add(
                        'active'
                    );

                    tampilkanTheme(
                        theme
                    );

                    setTimeout(
                        () => {
                            map.invalidateSize();
                        },
                        100
                    );
                }
            );
        }
    );


    /* ========================================================
       34b. SAKELAR LAYER TAMBAHAN (OVERLAY) BERANDA
       ======================================================== */

    const overlayCheckboxes =
        document.querySelectorAll(
            '.map-overlay-cb'
        );

    overlayCheckboxes.forEach(
        checkbox => {

            checkbox.addEventListener(
                'change',
                function() {

                    const type =
                        this.dataset.overlay;

                    let targetLayer = null;
                    if (type === 'jalan') targetLayer = jalanLayer;
                    if (type === 'kecamatan') targetLayer = kecamatanLayer;
                    if (type === 'srs') targetLayer = srsLayer;

                    if (targetLayer) {

                        if (this.checked) {

                            if (!map.hasLayer(targetLayer)) {
                                targetLayer.addTo(map);
                            }

                        } else {

                            if (map.hasLayer(targetLayer)) {
                                map.removeLayer(targetLayer);
                            }
                        }
                    }
                }
            );
        }
    );


    /* ========================================================
       35. TOMBOL LOKASI BERANDA
       ======================================================== */

    const btnDetect =
        document.getElementById(
            'btn-detect-area'
        );


    if (btnDetect) {

        btnDetect.addEventListener(
            'click',
            function() {

                map.locate({
                    setView: true,
                    maxZoom: 14
                });
            }
        );
    }


    map.on(
        'locationfound',
        function(e) {

            L.marker(
                e.latlng
            )
            .addTo(map)
            .bindPopup(
                '📍 Lokasi Anda'
            )
            .openPopup();
        }
    );


    map.on(
        'locationerror',
        function() {

            alert(
                'Lokasi tidak dapat ditemukan. Silakan izinkan akses lokasi pada browser.'
            );
        }
    );


    /* ========================================================
       36. QUICK RESPONSE
       ======================================================== */

    const btnQuick =
        document.getElementById(
            'btn-quick-response'
        );


    if (btnQuick) {

        btnQuick.addEventListener(
            'click',
            function() {

                map.setView(
                    [-7.7956, 110.3695],
                    10
                );
            }
        );
    }


    /* ========================================================
       37. TAMPILAN AWAL
       ======================================================== */

    tampilkanTheme(
        'wmk'
    );


    /* ========================================================
       38. INVALIDATE SIZE
       ======================================================== */

    setTimeout(
        function() {

            map.invalidateSize();

        },
        500
    );


    /* ========================================================
       39. DEBUG BERANDA
       ======================================================== */

    console.log(
        '===================================='
    );

    console.log(
        '🔥 SISTEM PETA BERANDA DAMKAR DIY AKTIF'
    );

    console.log(
        '✓ Peta Dasar'
    );

    console.log(
        '✓ Kabupaten'
    );

    console.log(
        '✓ Kecamatan'
    );

    console.log(
        '✓ Desa'
    );

    console.log(
        '✓ Pos Damkar'
    );

    console.log(
        '✓ Buffer Damkar'
    );

    console.log(
        '✓ Laporan'
    );

    console.log(
        '✓ Pertanian'
    );

    console.log(
        '✓ Tangki Air'
    );

    console.log(
        '✓ Cagar Budaya'
    );

    console.log(
        '✓ SRS'
    );

    console.log(
        '✓ Sumbu Filosofis'
    );

    console.log(
        `✓ ${jumlahPosDamkar} Pos Damkar`
    );

    console.log(
        '===================================='
    );

});