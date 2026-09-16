/* ============================================================
   SISTEM LAPORAN KEBAKARAN DAMKAR DIY
   MAP.JS - MULTI THEME MAP
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

    /* ========================================================
       1. INISIALISASI PETA
       ======================================================== */

    const map = L.map('admin-live-map', {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView([-7.7956, 110.3695], 10);

    L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }
    ).addTo(map);


    /* ========================================================
       2. SEMUA LAYER
       ======================================================== */

    const kabupatenLayer = L.layerGroup();
    const kecamatanLayer = L.layerGroup();
    const desaLayer = L.layerGroup();

    const damkarLayer = L.layerGroup();
    const bufferDamkarLayer = L.layerGroup();

    const laporanLayer = L.layerGroup();
    const nonKebakaranLayer = L.layerGroup();

    const pertanianLayer = L.layerGroup();
    const tangkiAirLayer = L.layerGroup();

    const srsLayer = L.layerGroup();
    const cagarBudayaLayer = L.layerGroup();
    const sumbuFilosofisLayer = L.layerGroup();

    /* Layer khusus peta tematik */
    const kebakaranTematikLayer = L.layerGroup();
    const nonKebakaranTematikLayer = L.layerGroup();


    /* ========================================================
       3. VARIABEL DATA
       ======================================================== */

    let dataKabupaten = null;
    let dataKecamatan = null;
    let dataDesa = null;
    let dataLaporan = [];

    let jumlahPosDamkar = 0;


    /* ========================================================
       4. WARNA PETA KEBAKARAN
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
       5. KONVERSI EPSG:32749
       ======================================================== */

    function utm49SouthToWgs84(easting, northing) {

        const a = 6378137.0;
        const eccSquared = 0.00669438;
        const k0 = 0.9996;

        const x = Number(easting) - 500000;
        const y = Number(northing) - 10000000;

        const eccPrimeSquared =
            eccSquared / (1 - eccSquared);

        const M = y / k0;

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

        const sinFp = Math.sin(fp);
        const cosFp = Math.cos(fp);
        const tanFp = Math.tan(fp);

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
       6. KONVERSI GEOJSON
       ======================================================== */

    function convertGeometry(geometry) {

        if (!geometry) {
            return geometry;
        }

        function convertCoordinates(coords) {

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

            return coords.map(convertCoordinates);
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
                data.features.map(feature => ({
                    ...feature,

                    geometry:
                        convertGeometry(
                            feature.geometry
                        )
                }))
        };
    }


    /* ========================================================
       7. LOAD JSON
       ======================================================== */

    async function loadJSON(url) {

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Gagal mengambil ${url}`
            );
        }

        return await response.json();
    }


    /* ========================================================
       8. NAMA WILAYAH
       ======================================================== */

    function getNamaWilayah(properties = {}) {

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
       9. AMBIL KOORDINAT DARI POLYGON
       ======================================================== */

    function getCenterOfFeature(feature) {

        try {

            const layer =
                L.geoJSON(feature);

            return layer.getBounds().getCenter();

        } catch (error) {

            return null;
        }
    }


    /* ========================================================
       10. LABEL WILAYAH
       ======================================================== */

    function buatLabelWilayah(
        feature,
        jumlah,
        tipe = 'Kecamatan'
    ) {

        const center =
            getCenterOfFeature(feature);

        if (!center) {
            return null;
        }

        const nama =
            getNamaWilayah(
                feature.properties || {}
            );

        const label =
            L.marker(
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
                                        ? `<br><span style="
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

        return label;
    }


    /* ========================================================
       11. AMBIL TAHUN LAPORAN
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

        if (Number.isNaN(tanggal.getTime())) {
            return null;
        }

        return tanggal.getFullYear();
    }


    /* ========================================================
       12. JENIS KEJADIAN
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
       13. KOORDINAT LAPORAN
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
       14. HITUNG KEJADIAN DALAM WILAYAH
       ======================================================== */

    function hitungLaporanDalamFeature(
        feature,
        daftarLaporan
    ) {

        const polygon =
            L.geoJSON(feature);

        let jumlah = 0;

        daftarLaporan.forEach(item => {

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
                    polygon.getBounds()
                        .contains(point)
                ) {

                    jumlah++;
                }

            } catch (error) {}
        });

        return jumlah;
    }


    /* ========================================================
       15. BUAT LEGENDA
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

            <div class="d-flex align-items-center gap-2 mb-1">
                <span style="
                    width:24px;
                    height:16px;
                    background:#e8f5d0;
                    display:inline-block;
                    border:1px solid #999;
                "></span>
                <span>0 kejadian</span>
            </div>

            <div class="d-flex align-items-center gap-2 mb-1">
                <span style="
                    width:24px;
                    height:16px;
                    background:#fff200;
                    display:inline-block;
                    border:1px solid #999;
                "></span>
                <span>1 kejadian</span>
            </div>

            <div class="d-flex align-items-center gap-2 mb-1">
                <span style="
                    width:24px;
                    height:16px;
                    background:#ff9800;
                    display:inline-block;
                    border:1px solid #999;
                "></span>
                <span>2 kejadian</span>
            </div>

            <div class="d-flex align-items-center gap-2">
                <span style="
                    width:24px;
                    height:16px;
                    background:#f7255c;
                    display:inline-block;
                    border:1px solid #999;
                "></span>
                <span>3+ kejadian</span>
            </div>

            <hr>

            <div class="small">
                <b>SUMBER DATA</b><br>
                Sistem Laporan Kebakaran<br>
                Damkar Daerah Istimewa Yogyakarta
            </div>
        `;
    }


    /* ========================================================
       16. LOAD BATAS KABUPATEN
       ======================================================== */

    try {

        dataKabupaten =
            await loadJSON(
                'data/diy-kabkota.geojson'
            );

        L.geoJSON(
            dataKabupaten,
            {

                style: {
                    color: '#1e3a8a',
                    weight: 2.8,
                    opacity: 0.95,
                    fillColor: '#bfdbfe',
                    fillOpacity: 0.08,
                    dashArray: '8, 5'
                },

                onEachFeature(feature, layer) {

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
                        <strong>
                            ${nama}
                        </strong>
                        <br>
                        Kabupaten/Kota DIY
                    `);
                }

            }
        ).addTo(kabupatenLayer);

    } catch (error) {

        console.error(
            'Gagal memuat batas kabupaten:',
            error
        );
    }


    /* ========================================================
       17. LOAD BATAS KECAMATAN
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

                onEachFeature(feature, layer) {

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
        ).addTo(kecamatanLayer);

    } catch (error) {

        console.error(
            'Gagal memuat batas kecamatan:',
            error
        );
    }


    function normalisasiNamaWilayah(nama) {

        return String(nama || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
    }


    try {

        dataDesa =
            await loadJSON(
                'data/diy-desa-titik.json'
            );

        dataDesa.forEach(desa => {

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

            const namaKd    = desa.kel_desa  || '-';
            const jenisKd   = desa.jenis_kd  || 'Desa/Kelurahan';
            const kecamatan = desa.kecamatan || '-';
            const kabKota   = desa.kab_kota  || '-';

            const isKota = kabKota.toLowerCase().includes('kota') || kabKota.toLowerCase().includes('yogyakarta');
            const prefixKab = (kabKota.toLowerCase().startsWith('kab') || kabKota.toLowerCase().startsWith('kota')) ? kabKota : `Kabupaten ${kabKota}`;
            const sebutanKec = isKota ? 'Kemantren' : 'Kapanewon';
            const sebutanDesa = isKota ? (jenisKd || 'Kelurahan') : (jenisKd || 'Kalurahan');
            const kodeWilayah = desa.kode_kd || desa.kode_kec || '-';
            const alamatLengkapDesa = `${sebutanDesa} ${namaKd}, ${sebutanKec} ${kecamatan}, ${prefixKab}, Daerah Istimewa Yogyakarta`;

            L.circleMarker(
                [lat, lng],
                {
                    radius: 5,
                    color: '#92400e',
                    weight: 1.2,
                    fillColor: '#f59e0b',
                    fillOpacity: 0.9
                }
            )
            .bindPopup(`
                <div style="min-width:260px; max-width:320px; font-size:12.5px; line-height:1.6; color:#1f2937;">
                    <div style="font-size:15px; font-weight:700; color:#b45309; margin-bottom:8px; display:flex; align-items:center; gap:6px; border-bottom:2px solid #fde68a; padding-bottom:5px;">
                        <span>🏘️</span> <span>${sebutanDesa} ${namaKd}</span>
                    </div>
                    <div style="margin-bottom:8px; background:#fffbeb; border:1px solid #fef3c7; border-left:4px solid #f59e0b; border-radius:4px; padding:6px 10px;">
                        <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#b45309; margin-bottom:2px;">
                            📍 Alamat Lengkap
                        </div>
                        <div style="font-size:12.5px; font-weight:600; color:#1e293b; line-height:1.4;">
                            ${alamatLengkapDesa}
                        </div>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:12px;">
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap; vertical-align:top;">
                                <i class="bi bi-geo-alt-fill" style="color:#f59e0b;"></i> Kab./Kota
                            </td>
                            <td style="font-weight:600; padding:4px 0; color:#1e293b;">${kabKota}</td>
                        </tr>
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap; vertical-align:top;">
                                <i class="bi bi-map-fill" style="color:#6366f1;"></i> ${sebutanKec}
                            </td>
                            <td style="font-weight:600; padding:4px 0; color:#1e293b;">${kecamatan}</td>
                        </tr>
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap; vertical-align:top;">
                                <i class="bi bi-house-fill" style="color:#10b981;"></i> ${sebutanDesa}
                            </td>
                            <td style="font-weight:600; padding:4px 0; color:#1e293b;">${namaKd}</td>
                        </tr>
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap; vertical-align:top;">
                                <i class="bi bi-hash" style="color:#8b5cf6;"></i> Kode Wilayah
                            </td>
                            <td style="font-weight:600; padding:4px 0; color:#1e293b;">${kodeWilayah}</td>
                        </tr>
                        <tr>
                            <td style="color:#64748b; padding:4px 6px 4px 0; white-space:nowrap; vertical-align:top;">
                                <i class="bi bi-compass" style="color:#0ea5e9;"></i> Koordinat
                            </td>
                            <td style="font-family:monospace; font-weight:500; padding:4px 0; color:#475569; font-size:11.5px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</td>
                        </tr>
                    </table>
                </div>
            `)
            .addTo(desaLayer);

        });

    } catch (error) {

        console.error(
            'Gagal memuat titik desa:',
            error
        );
    }


    /* ========================================================
       19. ICON POS DAMKAR
       ======================================================== */

    const damkarIcon =
        L.divIcon({

            className:
                'damkar-map-icon',

            html: `
                <div style="
                    width:34px;
                    height:34px;
                    background:#dc2626;
                    border:3px solid white;
                    border-radius:50%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    box-shadow:0 2px 8px rgba(0,0,0,.35);
                    font-size:18px;
                ">
                    🚒
                </div>
            `,

            iconSize: [34, 34],

            iconAnchor: [17, 17],

            popupAnchor: [0, -17]
        });


    /* ========================================================
       20. LOAD POS DAMKAR (EKSISTING & RENCANA)
       ======================================================== */

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

    try {
        const rawData =
            await loadJSON(
                'data/TITIK POS DAMKAR EKSISTING.geojson'
            );

        L.geoJSON(
            rawData,
            {
                pointToLayer(feature, latlng) {
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
                pointToLayer(feature, latlng) {
                    jumlahPosDamkar++;
                    const props = feature.properties || {};
                    const id = props.Id || props.ID || jumlahPosDamkar;
                    const nama = props.Nama || props.NAMA || props.nama || `Pos Damkar Rencana ${jumlahPosDamkar}`;
                    const kab = props.Kabupaten || 'Daerah Istimewa Yogyakarta';

                    const marker = L.marker(
                        latlng,
                        { icon: posRencanaIcon }
                    );

                    marker.bindTooltip(`🛡️ ${nama}`, { permanent: false, direction: 'top' });

                    marker.bindPopup(`
                        <div style="min-width:230px;">
                            <div style="font-size:16px; font-weight:bold; color:#103B78; margin-bottom:6px;">
                                🛡️ ${nama}
                            </div>
                            <span class="badge bg-primary" style="background:#103B78!important; margin-bottom:8px; display:inline-block;">Pos Pemadam Kebakaran Rencana</span>
                            <div style="font-size:13px; margin-top:4px;">
                                <b>Wilayah:</b> ${kab}<br>
                                <b>Koordinat:</b> ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}
                            </div>
                            <hr style="margin:8px 0;">
                            <small class="text-muted">Rencana Pengembangan Pos Damkar</small>
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
       21. BUFFER POS DAMKAR (JANGKAUAN LAYANAN)
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
                onEachFeature(feature, layer) {
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
                onEachFeature(feature, layer) {
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
       22. LOAD LAPORAN
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

            let jumlahKebakaran = 0;
            let jumlahNonKebakaran = 0;


            dataLaporan.forEach(item => {

                const posisi =
                    getLatLngLaporan(item);

                if (!posisi) {
                    return;
                }


                if (isKebakaran(item)) {

                    jumlahKebakaran++;

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
                        <div style="
                            min-width:230px;
                        ">

                            <strong style="
                                color:#dc2626;
                                font-size:17px;
                            ">
                                🔥 LAPORAN KEBAKARAN
                            </strong>

                            <hr>

                            <b>Lokasi:</b><br>
                            ${
                                item.alamat || '-'
                            }

                            <br><br>

                            <b>Jenis:</b>
                            ${
                                item.jenis_kejadian || 'Kebakaran'
                            }

                            <br><br>

                            <b>Status:</b>
                            ${
                                item.status || 'Menunggu'
                            }

                        </div>
                    `)
                    .addTo(laporanLayer);

                } else {

                    jumlahNonKebakaran++;

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
                        <div style="
                            min-width:230px;
                        ">

                            <strong style="
                                color:#d97706;
                                font-size:17px;
                            ">
                                ⚠️ NON-KEBAKARAN
                            </strong>

                            <hr>

                            <b>Lokasi:</b><br>
                            ${
                                item.alamat || '-'
                            }

                            <br><br>

                            <b>Jenis:</b>
                            ${
                                item.jenis_kejadian || '-'
                            }

                            <br><br>

                            <b>Status:</b>
                            ${
                                item.status || 'Menunggu'
                            }

                        </div>
                    `)
                    .addTo(nonKebakaranLayer);
                }

            });


            console.log(
                `🔥 Kebakaran: ${jumlahKebakaran}`
            );

            console.log(
                `⚠️ Non-kebakaran: ${jumlahNonKebakaran}`
            );


        } catch (error) {

            console.warn(
                'Data laporan belum tersedia:',
                error
            );

        }

    }


    await loadLaporan();

    function getPertanianFillColor(namaKecamatan) {

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
                        fillColor: getPertanianFillColor(
                            nama
                        ),
                        fillOpacity: 0.72
                    };
                },

                onEachFeature(feature, layer) {

                    const nama =
                        getNamaWilayah(
                            feature.properties
                        );

                    layer.bindPopup(`
                        <strong>${nama}</strong>
                        <br>
                        <small>
                            Peta Potensi Kebakaran
                            Lahan Pertanian
                        </small>
                    `);
                }

            }
        ).addTo(pertanianLayer);

    }

    renderPertanianLayer();

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

        tangkiPoints.forEach(point => {
            L.circleMarker(
                [point.lat, point.lng],
                {
                    radius: 8,
                    color: '#0369a1',
                    weight: 2,
                    fillColor: '#0284c7',
                    fillOpacity: 0.9
                }
            )
            .bindPopup(`<strong>💧 ${point.name}</strong><br>Kapasitas pasokan air darurat`)
            .addTo(tangkiAirLayer);

            L.circle(
                [point.lat, point.lng],
                {
                    radius: 4000,
                    color: '#0284c7',
                    weight: 1.5,
                    dashArray: '3 3',
                    fillColor: '#38bdf8',
                    fillOpacity: 0.12
                }
            )
            .addTo(tangkiAirLayer);
        });

    }

    renderTangkiAirLayer();

    async function renderCagarBudayaLayer() {

        cagarBudayaLayer.clearLayers();

        try {
            const rawData =
                await loadJSON(
                    'data/TITIK CAGAR BUDAYA.geojson'
                );

            const data =
                convertUtmGeoJSON(
                    rawData
                );

            L.geoJSON(
                data,
                {
                    pointToLayer(feature, latlng) {
                        const marker = L.circleMarker(
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
                        ).addTo(cagarBudayaLayer);

                        return marker;
                    },

                    onEachFeature(feature, layer) {
                        const props =
                            feature.properties || {};

                        const nama =
                            props.NAMA ||
                            props.Nama ||
                            props.nama ||
                            'Cagar Budaya DIY';

                        layer.bindPopup(`
                            <strong>🏛️ ${nama}</strong>
                            <br>
                            <small>
                                Situs Cagar Budaya Dilindungi
                            </small>
                        `);
                    }
                }
            ).addTo(cagarBudayaLayer);

        } catch (error) {
            console.warn(
                'Gagal memuat layer cagar budaya:',
                error
            );
        }

    }

    await renderCagarBudayaLayer();
    await renderSrsLayer();

    const SRS_PALETTE = {
        'candi prambanan': { fill: '#C4B5FD', stroke: '#5B21B6', label: 'SRS Candi Prambanan – Candi Ijo' },
        'prambanan': { fill: '#C4B5FD', stroke: '#5B21B6', label: 'SRS Candi Prambanan – Candi Ijo' },
        'merapi': { fill: '#86EFAC', stroke: '#15803D', label: 'SRS Gunung Merapi' },
        'karaton': { fill: '#FDE047', stroke: '#A16207', label: 'SRS Karaton' },
        'kraton': { fill: '#FDE047', stroke: '#A16207', label: 'SRS Karaton' },
        'gunungsewu': { fill: '#7DD3FC', stroke: '#0369A1', label: 'SRS Karst Gunungsewu' },
        'gunung sewu': { fill: '#7DD3FC', stroke: '#0369A1', label: 'SRS Karst Gunungsewu' },
        'kerto': { fill: '#FCA5A5', stroke: '#DC2626', label: 'SRS Kerto - Pleret' },
        'pleret': { fill: '#FCA5A5', stroke: '#DC2626', label: 'SRS Kerto - Pleret' },
        'kotabaru': { fill: '#5EEAD4', stroke: '#0D9488', label: 'SRS Kotabaru' },
        'girigondo': { fill: '#93C5FD', stroke: '#2563EB', label: 'SRS Makam Girigondo' },
        'imogiri': { fill: '#A5B4FC', stroke: '#4338CA', label: 'SRS Makam Raja-Raja Mataram di Imogiri' },
        'pathok negoro': { fill: '#F0ABFC', stroke: '#C026D3', label: 'SRS Masjid Pathok Negoro' },
        'pathoknegoro': { fill: '#F0ABFC', stroke: '#C026D3', label: 'SRS Masjid Pathok Negoro' },
        'kotagede': { fill: '#6EE7B7', stroke: '#059669', label: 'SRS Masjid dan Makam Raja Mataram di Kotagede' },
        'samas': { fill: '#FCD34D', stroke: '#D97706', label: 'SRS Pantai Samas – Parangtritis' },
        'parangtritis': { fill: '#FCD34D', stroke: '#D97706', label: 'SRS Pantai Samas – Parangtritis' },
        'pantai selatan gunungkidul': { fill: '#38BDF8', stroke: '#0369A1', label: 'SRS Pantai Selatan Gunungkidul' },
        'pantai selatan kulon progo': { fill: '#FDBA74', stroke: '#EA580C', label: 'SRS Pantai Selatan Kulon Progo' },
        'menoreh': { fill: '#FED7AA', stroke: '#B45309', label: 'SRS Perbukitan Menoreh' },
        'pakualaman': { fill: '#BEF264', stroke: '#65A30D', label: 'SRS Puro Pakualaman' },
        'wates': { fill: '#FDA4AF', stroke: '#E11D48', label: 'SRS Pusat Kota Wates' },
        'sokoliman': { fill: '#D6D3D1', stroke: '#78716C', label: 'SRS Sokoliman' },
        'sumbu filosofi': { fill: '#FEF08A', stroke: '#EAB308', label: 'SRS Sumbu Filosofi Tugu Pal Putih - Panggung Krapyak' },
        'tugu': { fill: '#FEF08A', stroke: '#EAB308', label: 'SRS Sumbu Filosofi Tugu Pal Putih - Panggung Krapyak' }
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

        if (raw.includes('gunungkidul')) return { color: '#0369A1', weight: 2, opacity: 1, fillColor: '#38BDF8', fillOpacity: 0.85 };
        if (raw.includes('kulon progo') || raw.includes('kulonprogo') || (raw.includes('pantai') && raw.includes('kulon'))) return { color: '#EA580C', weight: 2, opacity: 1, fillColor: '#FDBA74', fillOpacity: 0.85 };
        if (raw.includes('samas') || raw.includes('parangtritis')) return { color: '#D97706', weight: 2, opacity: 1, fillColor: '#FCD34D', fillOpacity: 0.85 };
        if (raw.includes('prambanan') || raw.includes('ijo')) return { color: '#5B21B6', weight: 2, opacity: 1, fillColor: '#C4B5FD', fillOpacity: 0.85 };
        if (raw.includes('merapi')) return { color: '#15803D', weight: 2, opacity: 1, fillColor: '#86EFAC', fillOpacity: 0.85 };
        if (raw.includes('karaton') || raw.includes('kraton')) return { color: '#A16207', weight: 2, opacity: 1, fillColor: '#FDE047', fillOpacity: 0.85 };
        if (raw.includes('gunungsewu') || raw.includes('gunung sewu') || raw.includes('sewu')) return { color: '#0369A1', weight: 2, opacity: 1, fillColor: '#7DD3FC', fillOpacity: 0.85 };
        if (raw.includes('kerto') || raw.includes('pleret')) return { color: '#DC2626', weight: 2, opacity: 1, fillColor: '#FCA5A5', fillOpacity: 0.85 };
        if (raw.includes('kotabaru')) return { color: '#0D9488', weight: 2, opacity: 1, fillColor: '#5EEAD4', fillOpacity: 0.85 };
        if (raw.includes('girigondo')) return { color: '#2563EB', weight: 2, opacity: 1, fillColor: '#93C5FD', fillOpacity: 0.85 };
        if (raw.includes('imogiri')) return { color: '#4338CA', weight: 2, opacity: 1, fillColor: '#A5B4FC', fillOpacity: 0.85 };
        if (raw.includes('pathok')) return { color: '#C026D3', weight: 2, opacity: 1, fillColor: '#F0ABFC', fillOpacity: 0.85 };
        if (raw.includes('kotagede')) return { color: '#059669', weight: 2, opacity: 1, fillColor: '#6EE7B7', fillOpacity: 0.85 };
        if (raw.includes('menoreh')) return { color: '#B45309', weight: 2, opacity: 1, fillColor: '#FED7AA', fillOpacity: 0.85 };
        if (raw.includes('pakualaman')) return { color: '#65A30D', weight: 2, opacity: 1, fillColor: '#BEF264', fillOpacity: 0.85 };
        if (raw.includes('wates')) return { color: '#E11D48', weight: 2, opacity: 1, fillColor: '#FDA4AF', fillOpacity: 0.85 };
        if (raw.includes('sokoliman')) return { color: '#78716C', weight: 2, opacity: 1, fillColor: '#D6D3D1', fillOpacity: 0.85 };
        if (raw.includes('sumbu') || raw.includes('filosofi') || raw.includes('tugu') || raw.includes('krapyak')) return { color: '#EAB308', weight: 3, opacity: 1, fillColor: '#FEF08A', fillOpacity: 0.88 };

        return { color: '#A16207', weight: 2, opacity: 1, fillColor: '#FDE047', fillOpacity: 0.85 };
    }

    async function renderSrsLayer() {

        srsLayer.clearLayers();

        try {
            const rawData = await loadJSON('data/AREA SRS.geojson');

            L.geoJSON(rawData, {
                style(feature) {
                    const props = feature.properties || {};
                    const name = props.REMARK || props.SRS_EDIT || props.SRS_FIX || props.NAMOBJ || '';
                    return getSrsStyle(name, feature);
                },

                onEachFeature(feature, layer) {
                    const props = feature.properties || {};
                    const name = props.REMARK || props.SRS_EDIT || props.SRS_FIX || props.NAMOBJ || 'Kawasan SRS DIY';

                    layer.bindPopup(`
                        <strong>Satuan Ruang Strategis (SRS)</strong>
                        <br>
                        ${name}
                    `);
                }
            }).addTo(srsLayer);

        } catch (error) {
            console.warn('Gagal memuat layer SRS:', error);
        }

    }

    async function renderFilosofisLayer() {

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
        ).bindPopup('<strong>Buffer Zone Sumbu Filosofi</strong><br>Kawasan Penyangga Warisan Budaya World Heritage').addTo(sumbuFilosofisLayer);

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
        ).bindPopup('<strong>Area Kraton Yogyakarta</strong><br>Kawasan Utama Istana Kraton').addTo(sumbuFilosofisLayer);

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
        ).bindPopup('<strong>Area Kepatihan</strong><br>Pusat Pemerintahan Gubernur DIY').addTo(sumbuFilosofisLayer);

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
        ).bindPopup('<strong>Area Taman Sari</strong><br>Situs Taman Air Cagar Budaya').addTo(sumbuFilosofisLayer);

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
        ).bindPopup('<strong>Area Masjid Gede Kauman</strong><br>Masjid Agung Kagungan Dalem').addTo(sumbuFilosofisLayer);

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
        ).bindPopup('<strong>Poros Kosmologi Sumbu Filosofis</strong><br>Panggung Krapyak - Kraton Yogyakarta - Tugu Golong Gilig').addTo(sumbuFilosofisLayer);

    }

    await renderFilosofisLayer();


    /* ========================================================
       23. PETA TEMATIK KEBAKARAN
       ======================================================== */

    function tampilkanPetaKebakaran() {

        kebakaranTematikLayer.clearLayers();

        if (!dataKecamatan) {

            console.warn(
                'Data kecamatan belum tersedia.'
            );

            return;
        }


        /*
         * Ambil laporan kebakaran.
         *
         * Jika tersedia data tahun 2024,
         * gunakan data tahun 2024.
         */

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


        if (laporan2024.length > 0) {

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


                /* POLYGON WARNA */

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


                /* LABEL NAMA KECAMATAN */

                const label =
                    buatLabelWilayah(
                        feature,
                        jumlah,
                        'Kecamatan'
                    );

                if (label) {

                    kebakaranTematikLayer.addLayer(
                        label
                    );
                }

            }
        );


        /* TITIK KEBAKARAN */

        laporanKebakaran.forEach(item => {

            const posisi =
                getLatLngLaporan(item);

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
                    ${
                        item.alamat || '-'
                    }

                    <br><br>

                    <b>Status:</b>
                    ${
                        item.status || 'Menunggu'
                    }
                `);

            kebakaranTematikLayer.addLayer(
                marker
            );

        });


        setLegend(
            legendKebakaran()
        );
    }


    /* ========================================================
       24. PETA NON-KEBAKARAN
       ======================================================== */

    function tampilkanPetaNonKebakaran() {

        nonKebakaranTematikLayer.clearLayers();

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

                nonKebakaranTematikLayer.addLayer(
                    polygon
                );


                const label =
                    buatLabelWilayah(
                        feature,
                        jumlah
                    );

                if (label) {

                    nonKebakaranTematikLayer.addLayer(
                        label
                    );
                }

            }
        );


        laporanNon.forEach(item => {

            const posisi =
                getLatLngLaporan(item);

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
                ${
                    item.alamat || '-'
                }

                <br><br>

                <b>Jenis:</b>
                ${
                    item.jenis_kejadian || '-'
                }
            `)
            .addTo(nonKebakaranTematikLayer);

        });


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
       25. SEMBUNYIKAN SEMUA LAYER
       ======================================================== */

    function sembunyikanSemuaLayer() {

        [
            kabupatenLayer,
            kecamatanLayer,
            desaLayer,
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
        ].forEach(layer => {

            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }

        });
    }


    /* ========================================================
       26. STATUS PETA
       ======================================================== */

    function setMapStatus(text) {

        const status =
            document.getElementById(
                'admin-map-status-badge'
            );

        if (status) {
            status.textContent = text;
        }
    }


    /* ========================================================
       27. TAMPILKAN THEME
       ======================================================== */

    function tampilkanTheme(theme) {

        sembunyikanSemuaLayer();

        const showWilayahDasar =
            !['dasar', 'batas-kabupaten', 'batas-kecamatan'].includes(
                theme
            );

        if (showWilayahDasar) {
            kabupatenLayer.addTo(map);
            kecamatanLayer.addTo(map);
        }


        /* =========================================
           PETA DASAR
           ========================================= */

        if (theme === 'dasar') {

            kabupatenLayer.addTo(map);
            kecamatanLayer.addTo(map);

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
                        vertical-align:middle;
                    "></span>
                    Batas Kabupaten/Kota
                </div>

                <div>
                    <span style="
                        display:inline-block;
                        width:24px;
                        height:2px;
                        background:#374151;
                        vertical-align:middle;
                    "></span>
                    Batas Kecamatan
                </div>
            `);

            return;
        }


        /* =========================================
           KEBAKARAN
           ========================================= */

        if (theme === 'kebakaran') {

            tampilkanPetaKebakaran();

            kebakaranTematikLayer.addTo(map);

            setMapStatus(
                'Peta Jumlah Kejadian Kebakaran'
            );

            return;
        }


        /* =========================================
           NON KEBAKARAN
           ========================================= */

        if (theme === 'non-kebakaran') {

            tampilkanPetaNonKebakaran();

            nonKebakaranTematikLayer.addTo(map);

            setMapStatus(
                'Peta Kejadian Non-Kebakaran'
            );

            return;
        }


        /* =========================================
           PERTANIAN
           ========================================= */

        if (theme === 'pertanian') {

            pertanianLayer.addTo(map);

            setMapStatus(
                'Risiko Kebakaran Pertanian'
            );

            setLegend(`
                <div class="fw-bold mb-2">
                    RISIKO KEBAKARAN PERTANIAN
                </div>

                <div>
                    Layer risiko kebakaran
                    wilayah pertanian DIY.
                </div>
            `);

            return;
        }


        /* =========================================
           WMK
           ========================================= */

        if (theme === 'wmk') {

            bufferDamkarLayer.addTo(map);
            damkarLayer.addTo(map);

            setMapStatus(
                'WMK & Pos Damkar'
            );

            setLegend(`
                <div class="fw-bold mb-2">
                    WMK & POS DAMKAR
                </div>

                <div class="mb-2">
                    <span style="
                        font-size:20px;
                    ">🚒</span>
                    Pos Damkar
                </div>

                <div>
                    <span style="
                        display:inline-block;
                        width:24px;
                        height:16px;
                        background:#60a5fa;
                        opacity:.7;
                        border:1px solid #2563eb;
                    "></span>
                    Jangkauan Pos Damkar
                </div>
            `);

            return;
        }


        /* =========================================
           TANGKI AIR
           ========================================= */

        if (theme === 'tangki-air') {

            kabupatenLayer.addTo(map);
            kecamatanLayer.addTo(map);
            tangkiAirLayer.addTo(map);

            setMapStatus(
                'Jangkauan Tangki Air'
            );

            setLegend(`
                <div class="fw-bold mb-2">
                    JANGKAUAN TANGKI AIR
                </div>

                <div>
                    Layer jangkauan tangki air
                    berdasarkan data spasial.
                </div>
            `);

            return;
        }


        /* =========================================
           WMK CAGAR
           ========================================= */

        if (theme === 'wmk-cagar') {

            kabupatenLayer.addTo(map);
            kecamatanLayer.addTo(map);
            cagarBudayaLayer.addTo(map);
            bufferDamkarLayer.addTo(map);

            setMapStatus(
                'WMK Cagar Budaya'
            );

            setLegend(`
                <div class="fw-bold mb-2">
                    WMK CAGAR BUDAYA
                </div>

                <div>
                    Wilayah cagar budaya
                    dan jangkauan Damkar.
                </div>
            `);

            return;
        }


        /* =========================================
           SUMBU FILOSOFIS
           ========================================= */

        if (theme === 'filosofis') {

            sumbuFilosofisLayer.addTo(map);

            setMapStatus(
                'Sumbu Filosofis DIY'
            );

            setLegend(`
                <div class="fw-bold mb-2">
                    SUMBU FILOSOFIS DIY
                </div>

                <div>
                    Layer Sumbu Filosofis
                    Daerah Istimewa Yogyakarta.
                </div>
            `);

            return;
        }


        /* =========================================
           SRS
           ========================================= */

        if (theme === 'srs') {

            srsLayer.addTo(map);

            setMapStatus(
                'SRS Strategis'
            );

            setLegend(`
                <div class="fw-bold mb-2">SATUAN RUANG STRATEGIS (SRS)</div>
                <div style="max-height:240px; overflow-y:auto; font-size:11px; line-height:1.4;">
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#C4B5FD;border:2px solid #5B21B6;border-radius:2px;margin-right:4px;"></span> Candi Prambanan – Candi Ijo</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#86EFAC;border:2px solid #15803D;border-radius:2px;margin-right:4px;"></span> Gunung Merapi</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#FDE047;border:2px solid #A16207;border-radius:2px;margin-right:4px;"></span> Karaton</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#7DD3FC;border:2px solid #0369A1;border-radius:2px;margin-right:4px;"></span> Karst Gunungsewu</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#FCA5A5;border:2px solid #DC2626;border-radius:2px;margin-right:4px;"></span> Kerto - Pleret</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#5EEAD4;border:2px solid #0D9488;border-radius:2px;margin-right:4px;"></span> Kotabaru</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#93C5FD;border:2px solid #2563EB;border-radius:2px;margin-right:4px;"></span> Makam Girigondo</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#A5B4FC;border:2px solid #4338CA;border-radius:2px;margin-right:4px;"></span> Makam Raja Imogiri</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#F0ABFC;border:2px solid #C026D3;border-radius:2px;margin-right:4px;"></span> Masjid Pathok Negoro</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#6EE7B7;border:2px solid #059669;border-radius:2px;margin-right:4px;"></span> Masjid Kotagede</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#FCD34D;border:2px solid #D97706;border-radius:2px;margin-right:4px;"></span> Pantai Samas – Parangtritis</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#38BDF8;border:2px solid #0369A1;border-radius:2px;margin-right:4px;"></span> Pantai Sel. Gunungkidul</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#FDBA74;border:2px solid #EA580C;border-radius:2px;margin-right:4px;"></span> Pantai Sel. Kulon Progo</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#FED7AA;border:2px solid #B45309;border-radius:2px;margin-right:4px;"></span> Perbukitan Menoreh</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#BEF264;border:2px solid #65A30D;border-radius:2px;margin-right:4px;"></span> Puro Pakualaman</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#FDA4AF;border:2px solid #E11D48;border-radius:2px;margin-right:4px;"></span> Pusat Kota Wates</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#D6D3D1;border:2px solid #78716C;border-radius:2px;margin-right:4px;"></span> Sokoliman</div>
                    <div class="mb-1"><span style="display:inline-block;width:12px;height:12px;background:#FEF08A;border:2px solid #EAB308;border-radius:2px;margin-right:4px;"></span> Sumbu Filosofi</div>
                </div>
            `);

            return;
        }


        /* =========================================
           BATAS KABUPATEN
           ========================================= */

        if (theme === 'batas-kabupaten') {

            kabupatenLayer.addTo(map);

            setMapStatus(
                'Batas Kabupaten/Kota'
            );

            setLegend(`
                <div class="fw-bold mb-2">
                    BATAS ADMINISTRASI
                </div>

                <div>
                    <span style="
                        display:inline-block;
                        width:25px;
                        border-top:3px solid #1e3a8a;
                    "></span>
                    Batas Kabupaten/Kota
                </div>
            `);

            return;
        }


        /* =========================================
           BATAS KECAMATAN
           ========================================= */

        if (theme === 'batas-kecamatan') {

            kecamatanLayer.addTo(map);

            setMapStatus(
                'Batas Kecamatan'
            );

            setLegend(`
                <div class="fw-bold mb-2">
                    BATAS KECAMATAN
                </div>

                <div>
                    <span style="
                        display:inline-block;
                        width:25px;
                        border-top:2px solid #374151;
                    "></span>
                    Batas Kecamatan
                </div>
            `);

            return;
        }


        /* =========================================
           DESA
           ========================================= */

        if (theme === 'desa') {

            desaLayer.addTo(map);

            setMapStatus(
                'Titik Desa/Kelurahan'
            );

            setLegend(`
                <div class="fw-bold mb-2">
                    TITIK DESA/KELURAHAN
                </div>

                <div>
                    <span style="
                        display:inline-block;
                        width:12px;
                        height:12px;
                        background:#f59e0b;
                        border-radius:50%;
                        border:1px solid #92400e;
                    "></span>
                    Titik Desa/Kelurahan
                </div>
            `);

            return;
        }


    }


    /* ========================================================
       28. TOMBOL PETA
       ======================================================== */

    const themeButtons =
        document.querySelectorAll(
            '#admin-map-theme-buttons [data-map-theme]'
        );


    themeButtons.forEach(button => {

        button.addEventListener(
            'click',
            function() {

                const theme =
                    this.dataset.mapTheme;


                /* Hapus active */

                themeButtons.forEach(btn => {

                    btn.classList.remove(
                        'active'
                    );

                });


                /* Aktifkan tombol */

                this.classList.add(
                    'active'
                );


                /* Ganti peta */

                tampilkanTheme(
                    theme
                );


                /* Refresh ukuran Leaflet */

                setTimeout(
                    () => {
                        map.invalidateSize();
                    },
                    100
                );

            }
        );

    });


    /* ========================================================
       29. TOMBOL LOKASI USER
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

            L.marker(e.latlng)
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
       30. QUICK RESPONSE
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
       31. TAMPILAN AWAL
       ======================================================== */

    tampilkanTheme('dasar');


    /* ========================================================
       32. INVALIDATE SIZE
       ======================================================== */

    setTimeout(
        function() {

            map.invalidateSize();

        },
        500
    );


    /* ========================================================
       33. DEBUG
       ======================================================== */

    console.log(
        '===================================='
    );

    console.log(
        '🔥 SISTEM PETA DAMKAR DIY AKTIF'
    );

    console.log(
        '✓ Multi Theme Map'
    );

    console.log(
        '✓ Peta Dasar'
    );

    console.log(
        '✓ Peta Kejadian Kebakaran'
    );

    console.log(
        '✓ Peta Non-Kebakaran'
    );

    console.log(
        '✓ Peta WMK & Pos Damkar'
    );

    console.log(
        '✓ Batas Kabupaten'
    );

    console.log(
        '✓ Batas Kecamatan'
    );

    console.log(
        '✓ Titik Desa'
    );

    console.log(
        `✓ ${jumlahPosDamkar} Pos Damkar`
    );

    console.log(
        '✓ Dynamic Legend'
    );

    console.log(
        '===================================='
    );

});