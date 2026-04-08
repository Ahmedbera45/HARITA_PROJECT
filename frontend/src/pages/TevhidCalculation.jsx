import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Chip, Divider, IconButton, Tooltip, Radio, RadioGroup,
  FormControlLabel, FormLabel, Stack, Autocomplete,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import GavelIcon from '@mui/icons-material/Gavel';
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

const EMPTY_FORM = {
  parcelId: null,
  ada: '', parselNo: '', mahalle: '', eskiAda: '', eskiParsel: '',
  malikAdi: '', planFonksiyonu: '', katsayi: '', rayicBedel: '', arsaM2: '', taksM2: '', cekmelerM2: '',
  notlar: '',
};

function calcHarc(katsayi, m2, rayic) {
  const k = parseFloat(katsayi) || 0;
  const m = parseFloat(m2) || 0;
  const r = parseFloat(rayic) || 0;
  return Math.round(k * m * r * 100) / 100;
}

export default function TevhidCalculation() {
  const { isManager } = useAuth();

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

  // Parsel arama (form içinde)
  const [searchAda, setSearchAda] = useState('');
  const [searchParsel, setSearchParsel] = useState('');
  const [searchMahalle, setSearchMahalle] = useState('');
  const [searching, setSearching] = useState(false);
  const [adaOptions, setAdaOptions] = useState([]);
  const [parselOptions, setParselOptions] = useState([]);
  const [mahalleOptions, setMahalleOptions] = useState([]);

  const fetchAC = useCallback((field, q, setter) => {
    if (!q || q.length < 2) { setter([]); return; }
    importService.autocomplete(q, field).then(setter).catch(() => setter([]));
  }, []);

  // Detay dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // İnceleme (review) dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ decision: 'Onaylandı', onaylananSenaryo: '', reviewNote: '' });
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');

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

  // ── Parsel arama ──────────────────────────────────────────────────
  const handleParcelSearch = async () => {
    if (!searchAda.trim() || !searchParsel.trim()) return;
    setSearching(true);
    try {
      const p = await importService.searchParcel(searchAda.trim(), searchParsel.trim(), searchMahalle.trim() || undefined);
      if (p) {
        setForm(f => ({
          ...f,
          parcelId: p.id,
          ada: p.ada || '',
          parselNo: p.parsel || '',
          mahalle: p.mahalle || '',
          eskiAda: p.eskiAda || '',
          eskiParsel: p.eskiParsel || '',
          malikAdi: p.malikAdi || '',
          planFonksiyonu: p.planFonksiyonu || '',
          rayicBedel: p.rayicBedel ? String(p.rayicBedel) : f.rayicBedel,
          arsaM2: p.alan ? String(p.alan) : f.arsaM2,
        }));
        setFormError('');
      } else {
        setFormError('Parsel bulunamadı — bilgileri manuel giriniz.');
      }
    } catch {
      setFormError('Arama sırasında hata oluştu.');
    } finally {
      setSearching(false);
    }
  };

  // ── Form ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSearchAda('');
    setSearchParsel('');
    setSearchMahalle('');
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setForm({
      parcelId: item.parcelId || null,
      ada: item.ada || '',
      parselNo: item.parselNo || '',
      mahalle: item.mahalle || '',
      eskiAda: item.eskiAda || '',
      eskiParsel: item.eskiParsel || '',
      malikAdi: item.malikAdi || '',
      planFonksiyonu: item.planFonksiyonu || '',
      katsayi: String(item.katsayi || ''),
      rayicBedel: String(item.rayicBedel || ''),
      arsaM2: String(item.arsaM2 || ''),
      taksM2: String(item.taksM2 || ''),
      cekmelerM2: String(item.cekmelerM2 || ''),
      notlar: item.notlar || '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.ada || !form.parselNo || !form.mahalle || !form.katsayi || !form.rayicBedel) {
      setFormError('Ada, Parsel No, Mahalle, Katsayı ve Rayiç Bedel zorunludur.');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      parcelId: form.parcelId || null,
      ada: form.ada,
      parselNo: form.parselNo,
      mahalle: form.mahalle,
      eskiAda: form.eskiAda || null,
      eskiParsel: form.eskiParsel || null,
      malikAdi: form.malikAdi || null,
      planFonksiyonu: form.planFonksiyonu || null,
      katsayi: parseFloat(form.katsayi) || 0,
      rayicBedel: parseFloat(form.rayicBedel) || 0,
      arsaM2: parseFloat(form.arsaM2) || 0,
      taksM2: parseFloat(form.taksM2) || 0,
      cekmelerM2: parseFloat(form.cekmelerM2) || 0,
      notlar: form.notlar || null,
    };
    try {
      if (editId) {
        await tevhidService.update(editId, payload);
        setSuccess('Hesaplama güncellendi.');
      } else {
        await tevhidService.create(payload);
        setSuccess('Hesaplama oluşturuldu.');
      }
      setFormOpen(false);
      loadList();
    } catch (e) {
      setFormError(e.response?.data?.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  // ── Review ────────────────────────────────────────────────────────
  const openReview = (item) => {
    setReviewTarget(item);
    setReviewForm({ decision: 'Onaylandı', onaylananSenaryo: '1', reviewNote: '' });
    setReviewError('');
    setReviewOpen(true);
  };

  const handleReview = async () => {
    if (reviewForm.decision === 'Onaylandı' && !reviewForm.onaylananSenaryo) {
      setReviewError('Onaylanacak senaryoyu seçiniz.');
      return;
    }
    setReviewing(true);
    setReviewError('');
    try {
      await tevhidService.review(reviewTarget.id, {
        decision: reviewForm.decision,
        onaylananSenaryo: reviewForm.decision === 'Onaylandı' ? parseInt(reviewForm.onaylananSenaryo) : null,
        reviewNote: reviewForm.reviewNote || null,
      });
      setSuccess('İnceleme kaydedildi.');
      setReviewOpen(false);
      loadList();
    } catch (e) {
      setReviewError(e.response?.data?.message || 'Hata oluştu.');
    } finally {
      setReviewing(false);
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
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = async () => {
    try {
      const res = await tevhidService.exportAllApproved();
      downloadBlob(res, `TevhidOnaylananlar_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      setError('Excel indirilemedi.');
    }
  };

  const handleExportScenarios = async (id) => {
    try {
      const res = await tevhidService.exportScenarios(id);
      downloadBlob(res, `Senaryolar_${id.slice(0, 8)}.xlsx`);
    } catch {
      setError('Excel indirilemedi.');
    }
  };

  const handleExportApproved = async (id) => {
    try {
      const res = await tevhidService.exportApproved(id);
      downloadBlob(res, `Onayli_${id.slice(0, 8)}.xlsx`);
    } catch {
      setError('Excel indirilemedi.');
    }
  };

  // ── Önizleme hesaplama ────────────────────────────────────────────
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

      {/* Filtre Çubuğu */}
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
              {['Ada', 'Parsel', 'Mahalle', 'Malik', 'S1: Arsa Harç', 'S2: TAKS Harç', 'S3: Çekme Harç', 'Durum', 'Oluşturan', 'İşlem'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={10} align="center">Kayıt yok</TableCell></TableRow>
            ) : list.map(item => (
              <TableRow key={item.id} hover>
                <TableCell>{item.ada}</TableCell>
                <TableCell>{item.parselNo}</TableCell>
                <TableCell>{item.mahalle}</TableCell>
                <TableCell>{item.malikAdi || '—'}</TableCell>
                <TableCell>{formatCurrency(item.arsaHarc)}</TableCell>
                <TableCell>{formatCurrency(item.taksHarc)}</TableCell>
                <TableCell>{formatCurrency(item.cekmelerHarc)}</TableCell>
                <TableCell>
                  <Chip label={item.status} color={statusColor(item.status)} size="small" />
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
                    {isManager && item.status === 'Bekliyor' && (
                      <Tooltip title="İncele / Onayla">
                        <IconButton size="small" color="primary" onClick={() => openReview(item)}>
                          <GavelIcon fontSize="small" />
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
          {/* Parsel arama */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>Parselden Otomatik Getir</Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Autocomplete
                freeSolo size="small"
                options={adaOptions}
                inputValue={searchAda}
                onInputChange={(_, v) => { setSearchAda(v); fetchAC('ada', v, setAdaOptions); }}
                sx={{ width: 110 }}
                renderInput={p => <TextField {...p} label="Ada" />}
              />
              <Autocomplete
                freeSolo size="small"
                options={parselOptions}
                inputValue={searchParsel}
                onInputChange={(_, v) => { setSearchParsel(v); fetchAC('parsel', v, setParselOptions); }}
                sx={{ width: 110 }}
                renderInput={p => <TextField {...p} label="Parsel" />}
              />
              <Autocomplete
                freeSolo size="small"
                options={mahalleOptions}
                inputValue={searchMahalle}
                onInputChange={(_, v) => { setSearchMahalle(v); fetchAC('mahalle', v, setMahalleOptions); }}
                sx={{ width: 190 }}
                renderInput={p => <TextField {...p} label="Mahalle (opsiyonel)" />}
              />
              <Button variant="outlined" startIcon={searching ? <CircularProgress size={16} /> : <SearchIcon />}
                onClick={handleParcelSearch} disabled={searching}>
                Getir
              </Button>
            </Stack>
          </Paper>

          {formError && <Alert severity="warning" sx={{ mb: 2 }}>{formError}</Alert>}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Ada *" size="small" value={form.ada}
                onChange={e => setForm(f => ({ ...f, ada: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Parsel No *" size="small" value={form.parselNo}
                onChange={e => setForm(f => ({ ...f, parselNo: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Mahalle *" size="small" value={form.mahalle}
                onChange={e => setForm(f => ({ ...f, mahalle: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Eski Ada" size="small" value={form.eskiAda}
                onChange={e => setForm(f => ({ ...f, eskiAda: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Eski Parsel" size="small" value={form.eskiParsel}
                onChange={e => setForm(f => ({ ...f, eskiParsel: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Malik Adı" size="small" value={form.malikAdi}
                onChange={e => setForm(f => ({ ...f, malikAdi: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField fullWidth label="Plan Fonksiyonu" size="small" value={form.planFonksiyonu}
                onChange={e => setForm(f => ({ ...f, planFonksiyonu: e.target.value }))} />
            </Grid>
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
                value={form.arsaM2}
                onChange={e => setForm(f => ({ ...f, arsaM2: e.target.value }))} />
              <Typography variant="caption" color="text.secondary">
                Tahmini: {formatCurrency(preview.arsa)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="S2: TAKS m²" size="small" type="number"
                value={form.taksM2}
                onChange={e => setForm(f => ({ ...f, taksM2: e.target.value }))} />
              <Typography variant="caption" color="text.secondary">
                Tahmini: {formatCurrency(preview.taks)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="S3: Çekmeler m²" size="small" type="number"
                value={form.cekmelerM2}
                onChange={e => setForm(f => ({ ...f, cekmelerM2: e.target.value }))} />
              <Typography variant="caption" color="text.secondary">
                Tahmini: {formatCurrency(preview.cekme)}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth label="Notlar" size="small" multiline rows={2}
                value={form.notlar}
                onChange={e => setForm(f => ({ ...f, notlar: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : (editId ? 'Güncelle' : 'Oluştur')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detay Dialog ──────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tevhid Detayı</DialogTitle>
        {selected && (
          <DialogContent dividers>
            <Grid container spacing={1}>
              {[
                ['Ada', selected.ada], ['Parsel', selected.parselNo], ['Mahalle', selected.mahalle],
                ['Eski Ada', selected.eskiAda || '—'], ['Eski Parsel', selected.eskiParsel || '—'],
                ['Malik', selected.malikAdi || '—'], ['Katsayı', selected.katsayi],
                ['Rayiç Bedel', formatCurrency(selected.rayicBedel)],
              ].map(([label, val]) => (
                <Grid item xs={6} key={label}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2">{val}</Typography>
                </Grid>
              ))}
            </Grid>
            <Divider sx={{ my: 2 }} />
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
                  <TableRow selected={selected.onaylananSenaryo === 1}>
                    <TableCell>S1: Arsa</TableCell>
                    <TableCell align="right">{selected.arsaM2}</TableCell>
                    <TableCell align="right">{formatCurrency(selected.arsaHarc)}</TableCell>
                  </TableRow>
                  <TableRow selected={selected.onaylananSenaryo === 2}>
                    <TableCell>S2: TAKS</TableCell>
                    <TableCell align="right">{selected.taksM2}</TableCell>
                    <TableCell align="right">{formatCurrency(selected.taksHarc)}</TableCell>
                  </TableRow>
                  <TableRow selected={selected.onaylananSenaryo === 3}>
                    <TableCell>S3: Çekmeler</TableCell>
                    <TableCell align="right">{selected.cekmelerM2}</TableCell>
                    <TableCell align="right">{formatCurrency(selected.cekmelerHarc)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={0.5}>
              <Box><Typography variant="caption" color="text.secondary">Durum</Typography>
                <Box><Chip label={selected.status} color={statusColor(selected.status)} size="small" /></Box>
              </Box>
              {selected.onaylananSenaryo && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Onaylanan Senaryo</Typography>
                  <Typography variant="body2">Senaryo {selected.onaylananSenaryo} — {formatCurrency(selected.onaylananHarc)}</Typography>
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
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* ── İnceleme Dialog ───────────────────────────────────────────── */}
      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tevhid İnceleme</DialogTitle>
        {reviewTarget && (
          <DialogContent dividers>
            <Typography variant="subtitle2" gutterBottom>
              {reviewTarget.ada}/{reviewTarget.parselNo} — {reviewTarget.mahalle}
            </Typography>

            {/* Senaryo karşılaştırma */}
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Senaryo</TableCell>
                    <TableCell align="right">m²</TableCell>
                    <TableCell align="right">Hesaplanan Harç</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>S1: Arsa</TableCell>
                    <TableCell align="right">{reviewTarget.arsaM2}</TableCell>
                    <TableCell align="right">{formatCurrency(reviewTarget.arsaHarc)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>S2: TAKS</TableCell>
                    <TableCell align="right">{reviewTarget.taksM2}</TableCell>
                    <TableCell align="right">{formatCurrency(reviewTarget.taksHarc)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>S3: Çekmeler</TableCell>
                    <TableCell align="right">{reviewTarget.cekmelerM2}</TableCell>
                    <TableCell align="right">{formatCurrency(reviewTarget.cekmelerHarc)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {reviewError && <Alert severity="error" sx={{ mb: 2 }}>{reviewError}</Alert>}

            <FormLabel>Karar</FormLabel>
            <RadioGroup row value={reviewForm.decision}
              onChange={e => setReviewForm(f => ({ ...f, decision: e.target.value }))}>
              <FormControlLabel value="Onaylandı" control={<Radio color="success" />} label="Onayla" />
              <FormControlLabel value="Reddedildi" control={<Radio color="error" />} label="Reddet" />
              <FormControlLabel value="Düzeltme İstendi" control={<Radio color="info" />} label="Düzeltme İste" />
            </RadioGroup>

            {reviewForm.decision === 'Onaylandı' && (
              <Box sx={{ mt: 1 }}>
                <FormLabel>Onaylanacak Senaryo</FormLabel>
                <RadioGroup row value={reviewForm.onaylananSenaryo}
                  onChange={e => setReviewForm(f => ({ ...f, onaylananSenaryo: e.target.value }))}>
                  <FormControlLabel value="1" control={<Radio />} label="S1: Arsa" />
                  <FormControlLabel value="2" control={<Radio />} label="S2: TAKS" />
                  <FormControlLabel value="3" control={<Radio />} label="S3: Çekmeler" />
                </RadioGroup>
              </Box>
            )}

            <TextField fullWidth multiline rows={3} label="İnceleme Notu" size="small" sx={{ mt: 2 }}
              value={reviewForm.reviewNote}
              onChange={e => setReviewForm(f => ({ ...f, reviewNote: e.target.value }))} />
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setReviewOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleReview} disabled={reviewing}>
            {reviewing ? <CircularProgress size={20} /> : 'Kaydet'}
          </Button>
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
