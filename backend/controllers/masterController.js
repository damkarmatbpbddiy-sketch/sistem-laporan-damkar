const { query } = require('../config/db');

function normalizeText(value) {
  return (value || '').toString().trim();
}

function validateRequired(value, fieldName, res) {
  if (!normalizeText(value)) {
    res.status(400).json({ success: false, message: `${fieldName} wajib diisi.` });
    return false;
  }
  return true;
}

async function listKabupaten(req, res, next) {
  try {
    const result = await query('SELECT * FROM kabupaten ORDER BY nama ASC');
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createKabupaten(req, res, next) {
  try {
    const nama = normalizeText(req.body.nama);
    if (!validateRequired(nama, 'Nama kabupaten', res)) return;

    const result = await query('INSERT INTO kabupaten (nama) VALUES ($1)', [nama]);
    return res.status(201).json({ success: true, message: 'Kabupaten ditambahkan.', data: result.rows?.[0] || null });
  } catch (error) {
    next(error);
  }
}

async function updateKabupaten(req, res, next) {
  try {
    const id = req.params.id;
    const nama = normalizeText(req.body.nama);
    if (!validateRequired(nama, 'Nama kabupaten', res)) return;

    const result = await query('UPDATE kabupaten SET nama = $1 WHERE id = $2', [nama, id]);
    const updated = await query('SELECT * FROM kabupaten WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Kabupaten diperbarui.', data: updated.rows?.[0] || null });
  } catch (error) {
    next(error);
  }
}

async function deleteKabupaten(req, res, next) {
  try {
    const id = req.params.id;
    await query('DELETE FROM kabupaten WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Kabupaten dihapus.' });
  } catch (error) {
    next(error);
  }
}

async function listKecamatan(req, res, next) {
  try {
    const result = await query(`
      SELECT k.id, k.nama, k.kabupaten_id, b.nama AS kabupaten_nama
      FROM kecamatan k
      LEFT JOIN kabupaten b ON b.id = k.kabupaten_id
      ORDER BY k.nama ASC
    `);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createKecamatan(req, res, next) {
  try {
    const nama = normalizeText(req.body.nama);
    const kabupaten_id = req.body.kabupaten_id;
    if (!validateRequired(nama, 'Nama kecamatan', res)) return;

    const result = await query('INSERT INTO kecamatan (nama, kabupaten_id) VALUES ($1, $2)', [nama, kabupaten_id || null]);
    return res.status(201).json({ success: true, message: 'Kecamatan ditambahkan.', data: result.rows?.[0] || null });
  } catch (error) {
    next(error);
  }
}

async function updateKecamatan(req, res, next) {
  try {
    const id = req.params.id;
    const nama = normalizeText(req.body.nama);
    const kabupaten_id = req.body.kabupaten_id;
    if (!validateRequired(nama, 'Nama kecamatan', res)) return;

    await query('UPDATE kecamatan SET nama = $1, kabupaten_id = $2 WHERE id = $3', [nama, kabupaten_id || null, id]);
    const updated = await query('SELECT * FROM kecamatan WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Kecamatan diperbarui.', data: updated.rows?.[0] || null });
  } catch (error) {
    next(error);
  }
}

async function deleteKecamatan(req, res, next) {
  try {
    await query('DELETE FROM kecamatan WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Kecamatan dihapus.' });
  } catch (error) {
    next(error);
  }
}

async function listPosDamkar(req, res, next) {
  try {
    const result = await query(`
      SELECT p.id, p.nama, p.alamat, p.kecamatan_id, p.latitude, p.longitude, k.nama AS kecamatan_nama
      FROM pos_damkar p
      LEFT JOIN kecamatan k ON k.id = p.kecamatan_id
      ORDER BY p.nama ASC
    `);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createPosDamkar(req, res, next) {
  try {
    const nama = normalizeText(req.body.nama);
    const alamat = normalizeText(req.body.alamat);
    const kecamatan_id = req.body.kecamatan_id;
    const latitude = normalizeText(req.body.latitude);
    const longitude = normalizeText(req.body.longitude);
    if (!validateRequired(nama, 'Nama pos damkar', res)) return;

    const result = await query(
      'INSERT INTO pos_damkar (nama, alamat, kecamatan_id, latitude, longitude) VALUES ($1, $2, $3, $4, $5)',
      [nama, alamat, kecamatan_id || null, latitude, longitude]
    );
    return res.status(201).json({ success: true, message: 'Pos damkar ditambahkan.', data: result.rows?.[0] || null });
  } catch (error) {
    next(error);
  }
}

async function updatePosDamkar(req, res, next) {
  try {
    const id = req.params.id;
    const nama = normalizeText(req.body.nama);
    const alamat = normalizeText(req.body.alamat);
    const kecamatan_id = req.body.kecamatan_id;
    const latitude = normalizeText(req.body.latitude);
    const longitude = normalizeText(req.body.longitude);
    if (!validateRequired(nama, 'Nama pos damkar', res)) return;

    await query(
      'UPDATE pos_damkar SET nama = $1, alamat = $2, kecamatan_id = $3, latitude = $4, longitude = $5 WHERE id = $6',
      [nama, alamat, kecamatan_id || null, latitude, longitude, id]
    );
    const updated = await query('SELECT * FROM pos_damkar WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Pos damkar diperbarui.', data: updated.rows?.[0] || null });
  } catch (error) {
    next(error);
  }
}

async function deletePosDamkar(req, res, next) {
  try {
    await query('DELETE FROM pos_damkar WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Pos damkar dihapus.' });
  } catch (error) {
    next(error);
  }
}

async function listPetugas(req, res, next) {
  try {
    const result = await query(`
      SELECT p.id, p.nama, p.nip, p.jabatan, p.pos_damkar_id, p.nomor_hp, p.status, d.nama AS pos_nama
      FROM petugas p
      LEFT JOIN pos_damkar d ON d.id = p.pos_damkar_id
      ORDER BY p.nama ASC
    `);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createPetugas(req, res, next) {
  try {
    const nama = normalizeText(req.body.nama);
    const nip = normalizeText(req.body.nip);
    const jabatan = normalizeText(req.body.jabatan);
    const pos_damkar_id = req.body.pos_damkar_id;
    const nomor_hp = normalizeText(req.body.nomor_hp);
    const status = normalizeText(req.body.status) || 'Aktif';
    if (!validateRequired(nama, 'Nama petugas', res)) return;

    const result = await query(
      'INSERT INTO petugas (nama, nip, jabatan, pos_damkar_id, nomor_hp, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [nama, nip, jabatan, pos_damkar_id || null, nomor_hp, status]
    );
    return res.status(201).json({ success: true, message: 'Petugas ditambahkan.', data: result.rows?.[0] || null });
  } catch (error) {
    next(error);
  }
}

async function updatePetugas(req, res, next) {
  try {
    const id = req.params.id;
    const nama = normalizeText(req.body.nama);
    const nip = normalizeText(req.body.nip);
    const jabatan = normalizeText(req.body.jabatan);
    const pos_damkar_id = req.body.pos_damkar_id;
    const nomor_hp = normalizeText(req.body.nomor_hp);
    const status = normalizeText(req.body.status) || 'Aktif';
    if (!validateRequired(nama, 'Nama petugas', res)) return;

    await query(
      'UPDATE petugas SET nama = $1, nip = $2, jabatan = $3, pos_damkar_id = $4, nomor_hp = $5, status = $6 WHERE id = $7',
      [nama, nip, jabatan, pos_damkar_id || null, nomor_hp, status, id]
    );
    const updated = await query('SELECT * FROM petugas WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Petugas diperbarui.', data: updated.rows?.[0] || null });
  } catch (error) {
    next(error);
  }
}

async function deletePetugas(req, res, next) {
  try {
    await query('DELETE FROM petugas WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Petugas dihapus.' });
  } catch (error) {
    next(error);
  }
}

async function listPerangkat(req, res, next) {
  try {
    const result = await query(`
      SELECT p.id, p.nama, p.jenis, p.status, p.petugas_id, t.nama AS petugas_nama
      FROM perangkat p
      LEFT JOIN petugas t ON t.id = p.petugas_id
      ORDER BY p.nama ASC
    `);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createPerangkat(req, res, next) {
  try {
    const nama = normalizeText(req.body.nama);
    const jenis = normalizeText(req.body.jenis);
    const status = normalizeText(req.body.status) || 'Siap Pakai';
    const petugas_id = req.body.petugas_id;
    if (!validateRequired(nama, 'Nama perangkat', res)) return;
    if (!validateRequired(jenis, 'Jenis perangkat', res)) return;

    const result = await query(
      'INSERT INTO perangkat (nama, jenis, status, petugas_id) VALUES ($1, $2, $3, $4)',
      [nama, jenis, status, petugas_id || null]
    );
    return res.status(201).json({ success: true, message: 'Perangkat ditambahkan.', data: result.rows?.[0] || null });
  } catch (error) {
    next(error);
  }
}

async function updatePerangkat(req, res, next) {
  try {
    const id = req.params.id;
    const nama = normalizeText(req.body.nama);
    const jenis = normalizeText(req.body.jenis);
    const status = normalizeText(req.body.status) || 'Siap Pakai';
    const petugas_id = req.body.petugas_id;
    if (!validateRequired(nama, 'Nama perangkat', res)) return;
    if (!validateRequired(jenis, 'Jenis perangkat', res)) return;

    await query(
      'UPDATE perangkat SET nama = $1, jenis = $2, status = $3, petugas_id = $4 WHERE id = $5',
      [nama, jenis, status, petugas_id || null, id]
    );
    const updated = await query('SELECT * FROM perangkat WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Perangkat diperbarui.', data: updated.rows?.[0] || null });
  } catch (error) {
    next(error);
  }
}

async function deletePerangkat(req, res, next) {
  try {
    await query('DELETE FROM perangkat WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Perangkat dihapus.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listKabupaten,
  createKabupaten,
  updateKabupaten,
  deleteKabupaten,
  listKecamatan,
  createKecamatan,
  updateKecamatan,
  deleteKecamatan,
  listPosDamkar,
  createPosDamkar,
  updatePosDamkar,
  deletePosDamkar,
  listPetugas,
  createPetugas,
  updatePetugas,
  deletePetugas,
  listPerangkat,
  createPerangkat,
  updatePerangkat,
  deletePerangkat,
};
