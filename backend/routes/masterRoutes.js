const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/masterController');

router.get('/kabupaten', verifyToken, listKabupaten);
router.post('/kabupaten', verifyToken, createKabupaten);
router.put('/kabupaten/:id', verifyToken, updateKabupaten);
router.delete('/kabupaten/:id', verifyToken, deleteKabupaten);

router.get('/kecamatan', verifyToken, listKecamatan);
router.post('/kecamatan', verifyToken, createKecamatan);
router.put('/kecamatan/:id', verifyToken, updateKecamatan);
router.delete('/kecamatan/:id', verifyToken, deleteKecamatan);

router.get('/pos-damkar', verifyToken, listPosDamkar);
router.post('/pos-damkar', verifyToken, createPosDamkar);
router.put('/pos-damkar/:id', verifyToken, updatePosDamkar);
router.delete('/pos-damkar/:id', verifyToken, deletePosDamkar);

router.get('/petugas', verifyToken, listPetugas);
router.post('/petugas', verifyToken, createPetugas);
router.put('/petugas/:id', verifyToken, updatePetugas);
router.delete('/petugas/:id', verifyToken, deletePetugas);

router.get('/perangkat', verifyToken, listPerangkat);
router.post('/perangkat', verifyToken, createPerangkat);
router.put('/perangkat/:id', verifyToken, updatePerangkat);
router.delete('/perangkat/:id', verifyToken, deletePerangkat);

module.exports = router;
