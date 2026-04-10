import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Chip, Divider, IconButton, Tooltip, Stack, Autocomplete,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ReplayIcon from '@mui/icons-material/Replay';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import tevhidService from '../services/tevhidService';
import importService from '../services/importService';
import { useAuth } from '../hooks/useAuth';
import PaginationBar from '../components/PaginationBar';

const formatCurrency = (val) =>
  val == null ? '—' : new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(val) + ' ₺';

const formatDate = (d) =>
  d ? new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const statusColor = (s) => {
  if (s === 'Onaylandı') return 'success';
  if (s === 'Reddedildi') return 'error';
  if (s === 'Düzeltme İstendi') return 'info';
  return 'warning';
};

const EMPTY_PARSEL = { ada: '', parselNo: '', mahalle: '', eskiAda: '', eskiParsel: '', malikAdi: '', planFonksiyonu: '', parcelId: null };

const EMPTY_FORM = {
  parseller: [{ ...EMPTY_PARSEL }],
  katsayi: '', rayicBedel: '', arsaM2: '', taksM2: '', cekmelerM2: '',
  notlar: '',
};

function calcHarc(katsayi, m2, rayic) {
  const k = parseFloat(katsayi) || 0;
  const m = parseFloat(m2) || 0;
  const r = parseFloat(rayic) || 0;
  return Math.round(k * m * r * 100) / 100;
}

export default function TevhidCalculation() {
  const { isManager, user } = useAuth();

  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Dosya yükleme
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Parsel arama autocomplete options (per row: index → options)
  const [adaOptions, setAdaOptions] = useState([]);
  const [parselOptions, setParselOptions] = useState([]);
  const [mahalleOptions, setMahalleOptions] = useState([]);
  const [searchingIdx, setSearchingIdx] = useState(null);

  const fetchAC = useCallback((field, q, setter) => {
    if (!q || q.length < 2) { setter([]); return; }
    importService.autocomplete(q, field).then(setter).catch(() => setter([]));
  }, []);

  // Detay dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // Silme
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  // Filtreler
  const [filterAda, setFilterAda] = useState('');
  const [filterParsel, setFilterParsel] = useState('');
  const [filterMahalle, setFilterMahalle] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const loadList = useCallback(() => {
    setLoading(true);
    tevhidService.getPaged({
      ada: filterAda || undefined,
      parsel: filterParsel || undefined,
      mahalle: filterMahalle || undefined,
      status: filterStatus || undefined,
      dateFrom: filterDateFrom || undefined,
      dateTo: filterDateTo || undefined,
      page, pageSize,
    })
      .then(r => { setList(r.items ?? []); setTotal(r.total ?? 0); })
      .catch(() => { setList([]); setError('Liste yüklenemedi'); })
      .finally(() => setLoading(false));
  }, [filterAda, filterParsel, filterMahalle, filterStatus, filterDateFrom, filterDateTo, page, pageSize]);

  useEffect(() => { loadList(); }, [loadList]);

  const handleFilterChange = (setter) => (val) => { setter(val); setPage(1); };

  // ── Çoklu Parsel ──────────────────────────────────────────────────
  const updateParsel = (idx, field, val) => {
    setForm(f => {
      const arr = [...f.parseller];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...f, parseller: arr };
    });
  };

  const addParsel = () => setForm(f => ({ ...f, parseller: [...f.parseller, { ...EMPTY_PARSEL }] }));

  const removeParsel = (idx) => {
    if (form.parseller.length <= 1) return;
    setForm(f => ({ ...f, parseller: f.parseller.filter((_, i) => i !== idx) }));
  };

  const handleParcelSearch = async (idx) => {
    const p = form.parseller[idx];
    if (!p.ada.trim() || !p.parselNo.trim()) return;
    setSearchingIdx(idx);
    try {
      const found = await importService.searchParcel(p.ada.trim(), p.parselNo.trim(), p.mahalle.trim() || undefined);
      if (found) {
        setForm(f => {
          const arr = [...f.parseller];
          arr[idx] = {
            ...arr[idx],
            parcelId: found.id,
            ada: found.ada || arr[idx].ada,
            parselNo: found.parsel || arr[idx].parselNo,
            mahalle: found.mahalle || arr[idx].mahalle,
            eskiAda: found.eskiAda || '',
            eskiParsel: found.eskiParsel || '',
            malikAdi: found.malikAdi || '',
            planFonksiyonu: found.planFonksiyonu || '',
          };
          // İlk parselden alan bilgilerini de al
          if (idx === 0) {
            return {
              ...f,
              parseller: arr,
              rayicBedel: found.rayicBedel ? String(found.rayicBedel) : f.rayicBedel,
              arsaM2: found.alan ? String(found.alan) : f.arsaM2,
            };
          }
          return { ...f, parseller: arr };
        });
        setFormError('');
      } else {
        setFormError(`Satır ${idx + 1}: Parsel bulunamadı — bilgileri manuel giriniz.`);
      }
    } catch {
      setFormError('Arama sırasında hata oluştu.');
    } finally {
      setSearchingIdx(null);
    }
  };

  // ── Form ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSelectedFile(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    const parseller = item.parseller?.length > 0
      ? item.parseller.map(p => ({
          parcelId: p.parcelId || null,
          ada: p.ada || '',
          parselNo: p.parselNo || '',
          mahalle: p.mahalle || '',
          eskiAda: p.eskiAda || '',
          eskiParsel: p.eskiParsel || '',
          malikAdi: p.malikAdi || '',
          planFonksiyonu: p.planFonksiyonu || '',
        }))
      : [{ parcelId: item.parcelId || null, ada: item.ada || '', parselNo: item.parselNo || '',
           mahalle: item.mahalle || '', eskiAda: item.eskiAda || '', eskiParsel: item.eskiParsel || '',
           malikAdi: item.malikAdi || '', planFonksiyonu: item.planFonksiyonu || '' }];

    setForm({
      parseller,
      katsayi: String(item.katsayi || ''),
      rayicBedel: String(item.rayicBedel || ''),
      arsaM2: String(item.arsaM2 || ''),
      taksM2: String(item.taksM2 || ''),
      cekmelerM2: String(item.cekmelerM2 || ''),
      notlar: item.notlar || '',
    });
    setSelectedFile(null);
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async () => {
    const firstP = form.parseller[0];
    if (!firstP?.ada || !firstP?.parselNo || !firstP?.mahalle || !form.katsayi || !form.rayicBedel) {
      setFormError('En az 1 parsel (Ada, Parsel No, Mahalle) ile Katsayı ve Rayiç Bedel zorunludur.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      ada: firstP.ada,
      parselNo: firstP.parselNo,
      mahalle: firstP.mahalle,
      katsayi: parseFloat(form.katsayi) || 0,
      rayicBedel: parseFloat(form.rayicBedel) || 0,
      arsaM2: parseFloat(form.arsaM2) || 0,
      taksM2: parseFloat(form.taksM2) || 0,
      cekmelerM2: parseFloat(form.cekmelerM2) || 0,
      notlar: form.notlar || null,
      parseller: form.parseller.map((p, i) => ({
        parcelId: p.parcelId || null,
        ada: p.ada, parselNo: p.parselNo, mahalle: p.mahalle || null,
        eskiAda: p.eskiAda || null, eskiParsel: p.eskiParsel || null,
        malikAdi: p.malikAdi || null, planFonksiyonu: p.planFonksiyonu || null,
        siraNo: i,
      })),
    };
    try {
      let saved;
      if (editId) {
        saved = await tevhidService.update(editId, payload);
        setSuccess('Hesaplama güncellendi.');
      } else {
        saved = await tevhidService.create(payload);
        setSuccess('Hesaplama oluşturuldu.');
      }
      // Dosya varsa yükle
      if (selectedFile && saved?.id) {
        setUploading(true);
        try {
          await tevhidService.uploadFile(saved.id, selectedFile);
        } catch {
          setError('Hesaplama kaydedildi fakat dosya yüklenemedi.');
        } finally {
          setUploading(false);
        }
      }
      setFormOpen(false);
      loadList();
    } catch (e) {
      setFormError(e.response?.data?.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  // ── Resubmit ──────────────────────────────────────────────────────
  const handleResubmit = async (id) => {
    try {
      await tevhidService.resubmit(id);
      setSuccess('Hesaplama tekrar onaya gönderildi.');
      loadList();
    } catch (e) {
      setError(e.response?.data?.message || 'İşlem başarısız.');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await tevhidService.delete(deleteDialog.id);
      setSuccess('Silindi.');
      setDeleteDialog({ open: false, id: null });
      loadList();
    } catch {
      setError('Silme başarısız.');
    }
  };

  // ── Export ────────────────────────────────────────────────────────
  const downloadBlob = (response, filename) => {
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = async () => {
    try {
      const res = await tevhidService.exportAllApproved();
      downloadBlob(res, `TevhidOnaylananlar_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch { setError('Excel indirilemedi.'); }
  };

  const handleExportScenarios = async (id) => {
    try {
      const res = await tevhidService.exportScenarios(id);
      downloadBlob(res, `Senaryolar_${id.slice(0, 8)}.xlsx`);
    } catch { setError('Excel indirilemedi.'); }
  };

  const handleExportApproved = async (id) => {
    try {
      const res = await tevhidService.exportApproved(id);
      downloadBlob(res, `Onayli_${id.slice(0, 8)}.xlsx`);
    } catch { setError('Excel indirilemedi.'); }
  };

  // ── Önizleme ─────────────────────────────────────────────────────
  const preview = {
    arsa: calcHarc(form.katsayi, form.arsaM2, form.rayicBedel),
    taks: calcHarc(form.katsayi, form.taksM2, form.rayicBedel),
    cekme: calcHarc(form.katsayi, form.cekmelerM2, form.rayicBedel),
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>
      {/* Başlık */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Tevhid Harcı Hesaplama</Typography>
        <Stack direction="row" spacing={1}>
          {isManager && (
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportAll}>
              Tüm Onaylananlar Excel
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Yeni Hesaplama
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      {/* Filtre */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
          <TextField size="small" label="Ada" value={filterAda} onChange={e => handleFilterChange(setFilterAda)(e.target.value)} sx={{ width: 90 }} />
          <TextField size="small" label="Parsel" value={filterParsel} onChange={e => handleFilterChange(setFilterParsel)(e.target.value)} sx={{ width: 90 }} />
          <TextField size="small" label="Mahalle" value={filterMahalle} onChange={e => handleFilterChange(setFilterMahalle)(e.target.value)} sx={{ width: 140 }} />
          <TextField select size="small" label="Durum" value={filterStatus} onChange={e => handleFilterChange(setFilterStatus)(e.target.value)} sx={{ width: 180 }}>
            {[{ v: '', l: 'Tümü' }, { v: 'Bekliyor', l: 'Bekliyor' }, { v: 'Onaylandı', l: 'Onaylandı' }, { v: 'Reddedildi', l: 'Reddedildi' }, { v: 'Düzeltme İstendi', l: 'Düzeltme İstendi' }].map(({ v, l }) => (
              <MenuItem key={v} value={v}>{l}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" label="Başlangıç" type="date" value={filterDateFrom}
            onChange={e => handleFilterChange(setFilterDateFrom)(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
          <TextField size="small" label="Bitiş" type="date" value={filterDateTo}
            onChange={e => handleFilterChange(setFilterDateTo)(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
          <Button size="small" variant="text" onClick={() => { setFilterAda(''); setFilterParsel(''); setFilterMahalle(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); setPage(1); }}>
            Temizle
          </Button>
        </Stack>
      </Paper>

      {/* Liste */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              {['Parseller', 'S1: Arsa Harç', 'S2: TAKS Harç', 'S3: Çekme Harç', 'Durum', 'Dosya', 'Oluşturan', 'İşlem'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center">Kayıt yok</TableCell></TableRow>
            ) : list.map(item => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{item.ada}/{item.parselNo}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.mahalle}</Typography>
                  {item.parseller?.length > 1 && (
                    <Chip label={`+${item.parseller.length - 1} parsel`} size="small" sx={{ ml: 0.5, fontSize: 10 }} />
                  )}
                </TableCell>
                <TableCell>{formatCurrency(item.arsaHarc)}</TableCell>
                <TableCell>{formatCurrency(item.taksHarc)}</TableCell>
                <TableCell>{formatCurrency(item.cekmelerHarc)}</TableCell>
                <TableCell>
                  <Chip label={item.status} color={statusColor(item.status)} size="small" />
                </TableCell>
                <TableCell>
                  {item.dosyaYolu ? (
                    <Tooltip title="Eki Görüntüle">
                      <IconButton size="small" component="a" href={item.dosyaYolu} target="_blank" rel="noopener">
                        <OpenInNewIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                  ) : '—'}
                </TableCell>
                <TableCell>{item.olusturanKullanici}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Detay">
                      <IconButton size="small" onClick={() => { setSelected(item); setDetailOpen(true); }}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="3 Senaryo Excel">
                      <IconButton size="small" onClick={() => handleExportScenarios(item.id)}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {item.status === 'Onaylandı' && (
                      <Tooltip title="Onaylı Excel">
                        <IconButton size="small" color="success" onClick={() => handleExportApproved(item.id)}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {(item.status === 'Reddedildi' || item.status === 'Düzeltme İstendi') &&
                     (isManager || item.createdByUserId === user?.id) && (
                      <Tooltip title="Tekrar Onaya Gönder">
                        <IconButton size="small" color="warning" onClick={() => handleResubmit(item.id)}>
                          <ReplayIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {isManager && (
                      <>
                        <Tooltip title="Düzenle">
                          <IconButton size="small" onClick={() => openEdit(item)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sil">
                          <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, id: item.id })}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginationBar total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </TableContainer>

      {/* ── Yeni / Düzenle Dialog ───────────────────────────────────── */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? 'Tevhid Harcı Düzenle' : 'Yeni Tevhid Harcı Hesaplama'}</DialogTitle>
        <DialogContent dividers>
          {formError && <Alert severity="warning" sx={{ mb: 2 }}>{formError}</Alert>}

          {/* Parsel Listesi */}
          <Typography variant="subtitle2" gutterBottom>Parseller</Typography>
          {form.parseller.map((p, idx) => (
            <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: 'grey.50' }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20 }}>#{idx + 1}</Typography>
                <Autocomplete
                  freeSolo size="small"
                  options={adaOptions}
                  inputValue={p.ada}
                  onInputChange={(_, v) => { updateParsel(idx, 'ada', v); fetchAC('ada', v, setAdaOptions); }}
                  sx={{ width: 90 }}
                  renderInput={params => <TextField {...params} label="Ada *" />}
                />
                <Autocomplete
                  freeSolo size="small"
                  options={parselOptions}
                  inputValue={p.parselNo}
                  onInputChange={(_, v) => { updateParsel(idx, 'parselNo', v); fetchAC('parsel', v, setParselOptions); }}
                  sx={{ width: 90 }}
                  renderInput={params => <TextField {...params} label="Parsel *" />}
                />
                <Autocomplete
                  freeSolo size="small"
                  options={mahalleOptions}
                  inputValue={p.mahalle || ''}
                  onInputChange={(_, v) => { updateParsel(idx, 'mahalle', v); fetchAC('mahalle', v, setMahalleOptions); }}
                  sx={{ width: 160 }}
                  renderInput={params => <TextField {...params} label="Mahalle *" />}
                />
                <Tooltip title="DB'den Getir">
                  <IconButton size="small" color="primary" onClick={() => handleParcelSearch(idx)} disabled={searchingIdx === idx}>
                    {searchingIdx === idx ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <TextField size="small" label="Malik" value={p.malikAdi || ''} onChange={e => updateParsel(idx, 'malikAdi', e.target.value)} sx={{ width: 140 }} />
                <TextField size="small" label="Eski Ada" value={p.eskiAda || ''} onChange={e => updateParsel(idx, 'eskiAda', e.target.value)} sx={{ width: 80 }} />
                <TextField size="small" label="Eski Parsel" value={p.eskiParsel || ''} onChange={e => updateParsel(idx, 'eskiParsel', e.target.value)} sx={{ width: 90 }} />
                <TextField size="small" label="Plan Fonk." value={p.planFonksiyonu || ''} onChange={e => updateParsel(idx, 'planFonksiyonu', e.target.value)} sx={{ width: 130 }} />
                <IconButton size="small" color="error" onClick={() => removeParsel(idx)} disabled={form.parseller.length <= 1}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={addParsel} sx={{ mb: 2 }}>
            Parsel Ekle
          </Button>

          <Divider sx={{ mb: 2 }} />

          {/* Hesaplama Girdileri */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Katsayı *" size="small" type="number"
                inputProps={{ step: '0.001' }} value={form.katsayi}
                onChange={e => setForm(f => ({ ...f, katsayi: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Rayiç Bedel (₺/m²) *" size="small" type="number"
                value={form.rayicBedel}
                onChange={e => setForm(f => ({ ...f, rayicBedel: e.target.value }))} />
            </Grid>

            <Grid item xs={12}>
              <Divider><Typography variant="caption">3 Senaryo</Typography></Divider>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="S1: Arsa m²" size="small" type="number"
                value={form.arsaM2} onChange={e => setForm(f => ({ ...f, arsaM2: e.target.value }))} />
              <Typography variant="caption" color="text.secondary">Tahmini: {formatCurrency(preview.arsa)}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="S2: TAKS m²" size="small" type="number"
                value={form.taksM2} onChange={e => setForm(f => ({ ...f, taksM2: e.target.value }))} />
              <Typography variant="caption" color="text.secondary">Tahmini: {formatCurrency(preview.taks)}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="S3: Çekmeler m²" size="small" type="number"
                value={form.cekmelerM2} onChange={e => setForm(f => ({ ...f, cekmelerM2: e.target.value }))} />
              <Typography variant="caption" color="text.secondary">Tahmini: {formatCurrency(preview.cekme)}</Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth label="Notlar" size="small" multiline rows={2}
                value={form.notlar} onChange={e => setForm(f => ({ ...f, notlar: e.target.value }))} />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="subtitle2" gutterBottom>Belge Ekle (opsiyonel)</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button component="label" variant="outlined" size="small" startIcon={<AttachFileIcon />}>
                  Dosya Seç
                  <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.docx"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                </Button>
                {selectedFile ? (
                  <Typography variant="caption">{selectedFile.name}</Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary">PDF, görsel veya Word</Typography>
                )}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || uploading}>
            {saving || uploading ? <CircularProgress size={20} /> : (editId ? 'Güncelle' : 'Oluştur')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detay Dialog ──────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Tevhid Detayı</DialogTitle>
        {selected && (
          <DialogContent dividers>
            {/* Parsel listesi */}
            {selected.parseller?.length > 0 ? (
              <>
                <Typography variant="subtitle2" gutterBottom>Parseller</Typography>
                <TableContainer sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['Ada', 'Parsel', 'Mahalle', 'Eski Ada', 'Eski Parsel', 'Malik', 'Plan Fonk.'].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selected.parseller.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>{p.ada}</TableCell>
                          <TableCell>{p.parselNo}</TableCell>
                          <TableCell>{p.mahalle || '—'}</TableCell>
                          <TableCell>{p.eskiAda || '—'}</TableCell>
                          <TableCell>{p.eskiParsel || '—'}</TableCell>
                          <TableCell>{p.malikAdi || '—'}</TableCell>
                          <TableCell>{p.planFonksiyonu || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {[
                  ['Ada', selected.ada], ['Parsel', selected.parselNo], ['Mahalle', selected.mahalle],
                  ['Eski Ada', selected.eskiAda || '—'], ['Eski Parsel', selected.eskiParsel || '—'],
                  ['Malik', selected.malikAdi || '—'],
                ].map(([label, val]) => (
                  <Grid item xs={6} key={label}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="body2">{val}</Typography>
                  </Grid>
                ))}
              </Grid>
            )}

            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Katsayı</Typography>
                <Typography variant="body2">{selected.katsayi}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Rayiç Bedel</Typography>
                <Typography variant="body2">{formatCurrency(selected.rayicBedel)}</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 1 }} />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Senaryo</TableCell>
                    <TableCell align="right">m²</TableCell>
                    <TableCell align="right">Hesaplanan Harç</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { label: 'S1: Arsa', m2: selected.arsaM2, harc: selected.arsaHarc, no: 1 },
                    { label: 'S2: TAKS', m2: selected.taksM2, harc: selected.taksHarc, no: 2 },
                    { label: 'S3: Çekmeler', m2: selected.cekmelerM2, harc: selected.cekmelerHarc, no: 3 },
                  ].map(row => (
                    <TableRow key={row.label} selected={selected.onaylananSenaryo === row.no}
                      sx={selected.onaylananSenaryo === row.no ? { bgcolor: 'success.light' } : {}}>
                      <TableCell>{row.label} {selected.onaylananSenaryo === row.no && <Chip label="Onaylı" size="small" color="success" sx={{ ml: 1 }} />}</TableCell>
                      <TableCell align="right">{row.m2}</TableCell>
                      <TableCell align="right">{formatCurrency(row.harc)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 2 }} />
            <Stack spacing={0.5}>
              <Box>
                <Typography variant="caption" color="text.secondary">Durum</Typography>
                <Box><Chip label={selected.status} color={statusColor(selected.status)} size="small" /></Box>
              </Box>
              {selected.onaylananSenaryo && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Onaylanan Harç</Typography>
                  <Typography variant="body2" fontWeight={700}>{formatCurrency(selected.onaylananHarc)}</Typography>
                </Box>
              )}
              {selected.reviewNote && (
                <Box>
                  <Typography variant="caption" color="text.secondary">İnceleme Notu</Typography>
                  <Typography variant="body2">{selected.reviewNote}</Typography>
                </Box>
              )}
              {selected.reviewedBy && (
                <Box>
                  <Typography variant="caption" color="text.secondary">İnceleyen</Typography>
                  <Typography variant="body2">{selected.reviewedBy} — {formatDate(selected.reviewedAt)}</Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">Oluşturan</Typography>
                <Typography variant="body2">{selected.olusturanKullanici} — {formatDate(selected.createdAt)}</Typography>
              </Box>
              {selected.notlar && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Notlar</Typography>
                  <Typography variant="body2">{selected.notlar}</Typography>
                </Box>
              )}
              {selected.dosyaYolu && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Ek Belge</Typography>
                  <Box>
                    <Button size="small" startIcon={<OpenInNewIcon />} component="a" href={selected.dosyaYolu} target="_blank" rel="noopener">
                      Belgeyi Görüntüle
                    </Button>
                  </Box>
                </Box>
              )}
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* ── Silme Onay ───────────────────────────────────────────────── */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
        <DialogTitle>Silme Onayı</DialogTitle>
        <DialogContent>
          <Typography>Bu tevhid hesaplamasını silmek istediğinizden emin misiniz?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>İptal</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Sil</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
