import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Chip, Divider, IconButton, Tooltip, Switch, FormControlLabel,
  Stack, ListSubheader, Select, FormControl, InputLabel, Autocomplete,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import feeService from '../services/feeService';
import importService from '../services/importService';
import { useAuth } from '../hooks/useAuth';
import PaginationBar from '../components/PaginationBar';

const formatCurrency = (val) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

const formatDate = (d) =>
  new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

const EMPTY_RATE_FORM = { categoryId: '', harcTuru: '', birimHarc: '', katsayi: '', aciklama: '', siraNo: 0, isActive: true };
const EMPTY_CAT_FORM = { name: '', description: '', siraNo: 0 };

export default function FeeCalculation() {
  const { isManager } = useAuth();

  const [rates, setRates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [history, setHistory] = useState([]);
  const [histTotal, setHistTotal] = useState(0);
  const [histPage, setHistPage] = useState(1);
  const [histPageSize, setHistPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    harcTuru: '', alanM2: '', ada: '', parsel: '', mahalle: '', malikAdi: '', planFonksiyonu: '', notlar: '',
  });

  const [preview, setPreview] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCalc, setSelectedCalc] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  // Harç kalemi yönetimi
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [rateEditId, setRateEditId] = useState(null);
  const [rateForm, setRateForm] = useState(EMPTY_RATE_FORM);
  const [rateSaving, setRateSaving] = useState(false);
  const [rateError, setRateError] = useState('');
  const [rateDeleteDialog, setRateDeleteDialog] = useState({ open: false, id: null });

  // Harç kategorisi yönetimi
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catEditId, setCatEditId] = useState(null);
  const [catForm, setCatForm] = useState(EMPTY_CAT_FORM);
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState('');
  const [catDeleteDialog, setCatDeleteDialog] = useState({ open: false, id: null });

  // Parsel arama
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

  const printRef = useRef();

  const loadRates = () => {
    feeService.getRates()
      .then(setRates)
      .catch(() => {});
  };

  const loadCategories = () => {
    feeService.getCategories()
      .then(setCategories)
      .catch(() => {});
  };

  const loadHistory = useCallback(() => {
    setHistLoading(true);
    feeService.getPaged({ page: histPage, pageSize: histPageSize })
      .then(r => { setHistory(r.items ?? []); setHistTotal(r.total ?? 0); })
      .catch(() => { setHistory([]); setHistTotal(0); })
      .finally(() => setHistLoading(false));
  }, [histPage, histPageSize]);

  useEffect(() => {
    loadRates();
    loadCategories();
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const activeRates = rates.filter(r => r.isActive);
  const selectedRate = activeRates.find(r => r.harcTuru === form.harcTuru);
  const katsayi = selectedRate?.katsayi ?? 1;
  const previewAmount =
    selectedRate && parseFloat(form.alanM2) > 0
      ? Math.round(parseFloat(form.alanM2) * selectedRate.birimHarc * katsayi * 100) / 100
      : null;

  const handleCalculate = async () => {
    setError('');
    setSuccess('');
    if (!form.harcTuru || !form.alanM2 || !form.ada || !form.parsel || !form.mahalle) {
      setError('Harç Türü, Alan, Ada, Parsel ve Mahalle zorunlu alanlardır.');
      return;
    }
    setLoading(true);
    try {
      const data = await feeService.calculate({
        harcTuru: form.harcTuru,
        alanM2: parseFloat(form.alanM2),
        ada: form.ada,
        parsel: form.parsel,
        mahalle: form.mahalle,
        malikAdi: form.malikAdi || null,
        planFonksiyonu: form.planFonksiyonu || null,
        notlar: form.notlar || null,
      });
      setPreview(data);
      setSuccess('Harç hesaplaması başarıyla kaydedildi.');
      setForm({ harcTuru: '', alanM2: '', ada: '', parsel: '', mahalle: '', malikAdi: '', planFonksiyonu: '', notlar: '' });
      loadHistory();
    } catch (e) {
      setError(e.response?.data?.message || 'Hesaplama sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleParcelSearch = async () => {
    if (!searchAda.trim() || !searchParsel.trim()) {
      setError('Ada ve Parsel numarası giriniz.');
      return;
    }
    setSearching(true);
    setError('');
    try {
      const p = await importService.searchParcel(searchAda.trim(), searchParsel.trim(), searchMahalle.trim() || undefined);
      setForm(prev => ({
        ...prev,
        ada: p.ada,
        parsel: p.parsel,
        mahalle: p.mahalle,
        malikAdi: p.malikAdi || '',
        planFonksiyonu: p.planFonksiyonu || '',
        alanM2: p.alan != null ? String(p.alan) : prev.alanM2,
      }));
      setSuccess('Parsel bilgileri getirildi.');
    } catch {
      setError('Parsel bulunamadı. Bilgileri manuel girebilirsiniz.');
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = async () => {
    try {
      await feeService.delete(deleteDialog.id);
      setDeleteDialog({ open: false, id: null });
      loadHistory();
    } catch {
      setError('Silme işlemi başarısız.');
    }
  };

  const handlePrint = (calc) => {
    setSelectedCalc(calc);
    setTimeout(() => window.print(), 300);
  };

  const handleViewDetail = (calc) => {
    setSelectedCalc(calc);
    setDetailOpen(true);
  };

  // ── Harç Kalemi Yönetimi ──────────────────────────────────────────
  const openCreateRate = () => {
    setRateEditId(null);
    setRateForm(EMPTY_RATE_FORM);
    setRateError('');
    setRateDialogOpen(true);
  };

  const openEditRate = (rate) => {
    setRateEditId(rate.id);
    setRateForm({
      categoryId: rate.categoryId || '',
      harcTuru: rate.harcTuru,
      birimHarc: rate.birimHarc,
      katsayi: rate.katsayi != null ? rate.katsayi : '',
      aciklama: rate.aciklama || '',
      siraNo: rate.siraNo,
      isActive: rate.isActive,
    });
    setRateError('');
    setRateDialogOpen(true);
  };

  const handleSaveRate = async () => {
    if (!rateForm.harcTuru.trim() || !rateForm.birimHarc) {
      setRateError('Harç Türü ve Birim Harç zorunludur.');
      return;
    }
    setRateSaving(true);
    setRateError('');
    try {
      const payload = {
        categoryId: rateForm.categoryId || null,
        harcTuru: rateForm.harcTuru,
        birimHarc: parseFloat(rateForm.birimHarc),
        katsayi: rateForm.katsayi !== '' ? parseFloat(rateForm.katsayi) : null,
        aciklama: rateForm.aciklama || null,
        siraNo: parseInt(rateForm.siraNo) || 0,
        isActive: rateForm.isActive,
      };
      if (rateEditId) {
        await feeService.updateRate(rateEditId, payload);
      } else {
        await feeService.createRate(payload);
      }
      setRateDialogOpen(false);
      loadRates();
    } catch (e) {
      setRateError(e.response?.data?.message || 'İşlem başarısız.');
    } finally {
      setRateSaving(false);
    }
  };

  const handleDeleteRate = async () => {
    try {
      await feeService.deleteRate(rateDeleteDialog.id);
      setRateDeleteDialog({ open: false, id: null });
      loadRates();
    } catch {
      setError('Harç kalemi silinemedi.');
    }
  };

  // ── Kategori Yönetimi ──────────────────────────────────────────────
  const openCreateCat = () => {
    setCatEditId(null);
    setCatForm(EMPTY_CAT_FORM);
    setCatError('');
    setCatDialogOpen(true);
  };

  const openEditCat = (cat) => {
    setCatEditId(cat.id);
    setCatForm({ name: cat.name, description: cat.description || '', siraNo: cat.siraNo });
    setCatError('');
    setCatDialogOpen(true);
  };

  const handleSaveCat = async () => {
    if (!catForm.name.trim()) { setCatError('Kategori adı zorunludur.'); return; }
    setCatSaving(true);
    setCatError('');
    try {
      const payload = { name: catForm.name, description: catForm.description || null, siraNo: parseInt(catForm.siraNo) || 0 };
      if (catEditId) {
        await feeService.updateCategory(catEditId, payload);
      } else {
        await feeService.createCategory(payload);
      }
      setCatDialogOpen(false);
      loadCategories();
      loadRates();
    } catch (e) {
      setCatError(e.response?.data?.message || 'İşlem başarısız.');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCat = async () => {
    try {
      await feeService.deleteCategory(catDeleteDialog.id);
      setCatDeleteDialog({ open: false, id: null });
      loadCategories();
      loadRates();
    } catch {
      setError('Kategori silinemedi.');
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Harç Hesaplama
      </Typography>

      <Grid container spacing={3}>
        {/* ── Hesaplama Formu ── */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>Yeni Hesaplama</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

            {/* Parselden Getir */}
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
                Parselden Otomatik Getir
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Autocomplete
                  freeSolo size="small"
                  options={adaOptions}
                  inputValue={searchAda}
                  onInputChange={(_, v) => { setSearchAda(v); fetchAC('ada', v, setAdaOptions); }}
                  sx={{ width: 100 }}
                  renderInput={p => <TextField {...p} label="Ada" onKeyDown={e => e.key === 'Enter' && handleParcelSearch()} />}
                />
                <Autocomplete
                  freeSolo size="small"
                  options={parselOptions}
                  inputValue={searchParsel}
                  onInputChange={(_, v) => { setSearchParsel(v); fetchAC('parsel', v, setParselOptions); }}
                  sx={{ width: 100 }}
                  renderInput={p => <TextField {...p} label="Parsel" onKeyDown={e => e.key === 'Enter' && handleParcelSearch()} />}
                />
                <Autocomplete
                  freeSolo size="small"
                  options={mahalleOptions}
                  inputValue={searchMahalle}
                  onInputChange={(_, v) => { setSearchMahalle(v); fetchAC('mahalle', v, setMahalleOptions); }}
                  sx={{ width: 180 }}
                  renderInput={p => <TextField {...p} label="Mahalle (opsiyonel)" onKeyDown={e => e.key === 'Enter' && handleParcelSearch()} />}
                />
                <Button size="small" variant="contained" color="secondary"
                  startIcon={searching ? null : <SearchIcon />}
                  onClick={handleParcelSearch} disabled={searching} sx={{ whiteSpace: 'nowrap' }}>
                  {searching ? 'Aranıyor...' : 'Getir'}
                </Button>
              </Stack>
            </Paper>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Harç Türü</InputLabel>
              <Select
                label="Harç Türü"
                value={form.harcTuru}
                onChange={e => setForm(p => ({ ...p, harcTuru: e.target.value }))}
              >
                {categories.length === 0
                  ? activeRates.map(r => (
                      <MenuItem key={r.id} value={r.harcTuru}>
                        <Box>
                          <Typography variant="body2">{r.harcTuru}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.birimHarc} TL/m²</Typography>
                        </Box>
                      </MenuItem>
                    ))
                  : (() => {
                      const items = [];
                      // Kategorili olanlar
                      const sortedCats = [...categories].sort((a, b) => a.siraNo - b.siraNo);
                      sortedCats.forEach(cat => {
                        const catRates = activeRates.filter(r => r.categoryId === cat.id);
                        if (catRates.length === 0) return;
                        items.push(
                          <ListSubheader key={`cat-${cat.id}`} sx={{ fontWeight: 700, color: 'primary.main', bgcolor: 'grey.50' }}>
                            {cat.name}
                          </ListSubheader>
                        );
                        catRates.forEach(r => items.push(
                          <MenuItem key={r.id} value={r.harcTuru} sx={{ pl: 3 }}>
                            <Box>
                              <Typography variant="body2">{r.harcTuru}</Typography>
                              <Typography variant="caption" color="text.secondary">{r.birimHarc} TL/m²</Typography>
                            </Box>
                          </MenuItem>
                        ));
                      });
                      // Kategorisiz olanlar
                      const uncategorized = activeRates.filter(r => !r.categoryId);
                      if (uncategorized.length > 0) {
                        items.push(
                          <ListSubheader key="cat-none" sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: 'grey.50' }}>
                            Diğer
                          </ListSubheader>
                        );
                        uncategorized.forEach(r => items.push(
                          <MenuItem key={r.id} value={r.harcTuru} sx={{ pl: 3 }}>
                            <Box>
                              <Typography variant="body2">{r.harcTuru}</Typography>
                              <Typography variant="caption" color="text.secondary">{r.birimHarc} TL/m²</Typography>
                            </Box>
                          </MenuItem>
                        ));
                      }
                      return items;
                    })()
                }
              </Select>
            </FormControl>

            <TextField
              fullWidth type="number" label="Alan (m²)" value={form.alanM2}
              onChange={e => setForm(p => ({ ...p, alanM2: e.target.value }))}
              sx={{ mb: 2 }}
            />

            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField fullWidth label="Ada" value={form.ada}
                  onChange={e => setForm(p => ({ ...p, ada: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Parsel" value={form.parsel}
                  onChange={e => setForm(p => ({ ...p, parsel: e.target.value }))} />
              </Grid>
            </Grid>

            <TextField fullWidth label="Mahalle" value={form.mahalle}
              onChange={e => setForm(p => ({ ...p, mahalle: e.target.value }))}
              sx={{ mb: 2 }} />

            <TextField fullWidth label="Malik Adı (opsiyonel)" value={form.malikAdi}
              onChange={e => setForm(p => ({ ...p, malikAdi: e.target.value }))}
              sx={{ mb: 2 }} />

            <TextField fullWidth label="Plan Fonksiyonu (opsiyonel)" value={form.planFonksiyonu}
              onChange={e => setForm(p => ({ ...p, planFonksiyonu: e.target.value }))}
              sx={{ mb: 2 }} />

            <TextField fullWidth multiline rows={2} label="Notlar (opsiyonel)" value={form.notlar}
              onChange={e => setForm(p => ({ ...p, notlar: e.target.value }))}
              sx={{ mb: 2 }} />

            {previewAmount !== null && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'primary.50' }}>
                <Typography variant="caption" color="text.secondary">Tahmini Harç Tutarı</Typography>
                <Typography variant="h5" color="primary" fontWeight={700}>
                  {formatCurrency(previewAmount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {parseFloat(form.alanM2)} m² × {selectedRate?.birimHarc} TL/m²
                  {selectedRate?.katsayi != null && ` × ${selectedRate.katsayi} (katsayı)`}
                </Typography>
              </Paper>
            )}

            <Button
              fullWidth variant="contained" size="large"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CalculateIcon />}
              onClick={handleCalculate} disabled={loading}
            >
              Hesapla ve Kaydet
            </Button>
          </Paper>

          {/* Harç Tarifeleri Paneli */}
          <Paper sx={{ p: 3, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Harç Tarifesi
              </Typography>
              {isManager && (
                <Stack direction="row" spacing={1}>
                  <Button size="small" startIcon={<AddIcon />} onClick={openCreateCat} variant="outlined" color="secondary">
                    Yeni Kategori
                  </Button>
                  <Button size="small" startIcon={<SettingsIcon />} onClick={openCreateRate} variant="outlined">
                    Yeni Kalem
                  </Button>
                </Stack>
              )}
            </Box>

            {/* Kategoriler + kalemler gruplu */}
            {categories.length > 0 && (
              <>
                {[...categories].sort((a, b) => a.siraNo - b.siraNo).map(cat => {
                  const catRates = rates.filter(r => r.categoryId === cat.id);
                  return (
                    <Box key={cat.id} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'primary.50', px: 1.5, py: 0.75, borderRadius: 1 }}>
                        <Typography variant="caption" fontWeight={700} color="primary">{cat.name}</Typography>
                        {isManager && (
                          <Stack direction="row">
                            <IconButton size="small" onClick={() => openEditCat(cat)}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => setCatDeleteDialog({ open: true, id: cat.id })}><DeleteIcon fontSize="small" /></IconButton>
                          </Stack>
                        )}
                      </Box>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            {catRates.map(r => (
                              <TableRow key={r.id} hover sx={{ opacity: r.isActive ? 1 : 0.5 }}>
                                <TableCell>
                                  <Typography variant="body2">{r.harcTuru}</Typography>
                                  {r.aciklama && <Typography variant="caption" color="text.secondary" display="block">{r.aciklama}</Typography>}
                                </TableCell>
                                <TableCell align="right"><Chip label={`${r.birimHarc} TL/m²`} size="small" color="primary" variant="outlined" /></TableCell>
                                <TableCell align="right">
                                  {r.katsayi != null ? <Chip label={r.katsayi} size="small" color="warning" variant="outlined" /> : <Typography variant="caption" color="text.disabled">—</Typography>}
                                </TableCell>
                                {isManager && <TableCell align="center"><Chip label={r.isActive ? 'Aktif' : 'Pasif'} size="small" color={r.isActive ? 'success' : 'default'} /></TableCell>}
                                {isManager && (
                                  <TableCell align="center">
                                    <IconButton size="small" color="primary" onClick={() => openEditRate(r)}><EditIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => setRateDeleteDialog({ open: true, id: r.id })}><DeleteIcon fontSize="small" /></IconButton>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  );
                })}
                {/* Kategorisiz kalemler */}
                {rates.filter(r => !r.categoryId).length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ bgcolor: 'grey.100', px: 1.5, py: 0.75, borderRadius: 1, mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">Diğer</Typography>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {rates.filter(r => !r.categoryId).map(r => (
                            <TableRow key={r.id} hover sx={{ opacity: r.isActive ? 1 : 0.5 }}>
                              <TableCell>
                                <Typography variant="body2">{r.harcTuru}</Typography>
                                {r.aciklama && <Typography variant="caption" color="text.secondary" display="block">{r.aciklama}</Typography>}
                              </TableCell>
                              <TableCell align="right"><Chip label={`${r.birimHarc} TL/m²`} size="small" color="primary" variant="outlined" /></TableCell>
                              <TableCell align="right">
                                {r.katsayi != null ? <Chip label={r.katsayi} size="small" color="warning" variant="outlined" /> : <Typography variant="caption" color="text.disabled">—</Typography>}
                              </TableCell>
                              {isManager && <TableCell align="center"><Chip label={r.isActive ? 'Aktif' : 'Pasif'} size="small" color={r.isActive ? 'success' : 'default'} /></TableCell>}
                              {isManager && (
                                <TableCell align="center">
                                  <IconButton size="small" color="primary" onClick={() => openEditRate(r)}><EditIcon fontSize="small" /></IconButton>
                                  <IconButton size="small" color="error" onClick={() => setRateDeleteDialog({ open: true, id: r.id })}><DeleteIcon fontSize="small" /></IconButton>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </>
            )}
            {/* Kategori yoksa düz liste */}
            {categories.length === 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Harç Türü</TableCell>
                      <TableCell align="right">TL/m²</TableCell>
                      <TableCell align="right">Katsayı</TableCell>
                      {isManager && <TableCell align="center">Durum</TableCell>}
                      {isManager && <TableCell align="center">İşlem</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rates.map(r => (
                      <TableRow key={r.id} hover sx={{ opacity: r.isActive ? 1 : 0.5 }}>
                        <TableCell>
                          <Typography variant="body2">{r.harcTuru}</Typography>
                          {r.aciklama && <Typography variant="caption" color="text.secondary" display="block">{r.aciklama}</Typography>}
                        </TableCell>
                        <TableCell align="right"><Chip label={`${r.birimHarc} TL/m²`} size="small" color="primary" variant="outlined" /></TableCell>
                        <TableCell align="right">
                          {r.katsayi != null ? <Chip label={r.katsayi} size="small" color="warning" variant="outlined" /> : <Typography variant="caption" color="text.disabled">—</Typography>}
                        </TableCell>
                        {isManager && <TableCell align="center"><Chip label={r.isActive ? 'Aktif' : 'Pasif'} size="small" color={r.isActive ? 'success' : 'default'} /></TableCell>}
                        {isManager && (
                          <TableCell align="center">
                            <Tooltip title="Düzenle"><IconButton size="small" color="primary" onClick={() => openEditRate(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Sil"><IconButton size="small" color="error" onClick={() => setRateDeleteDialog({ open: true, id: r.id })}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* ── Geçmiş Hesaplamalar ── */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>Hesaplama Geçmişi</Typography>
            {histLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : history.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                Henüz hesaplama yapılmamış.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Harç Türü</TableCell>
                      <TableCell>Ada/Parsel</TableCell>
                      <TableCell align="right">Alan</TableCell>
                      <TableCell align="right">Tutar</TableCell>
                      <TableCell>Hesaplayan</TableCell>
                      <TableCell>Tarih</TableCell>
                      <TableCell align="center">İşlem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map(h => (
                      <TableRow key={h.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{h.harcTuru}</Typography>
                          <Typography variant="caption" color="text.secondary">{h.mahalle}</Typography>
                        </TableCell>
                        <TableCell>{h.ada}/{h.parsel}</TableCell>
                        <TableCell align="right">{h.alanM2} m²</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600} color="primary">
                            {formatCurrency(h.toplamHarc)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{h.hesaplayanKullanici || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{formatDate(h.hesaplamaTarihi)}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Detay">
                            <IconButton size="small" onClick={() => handleViewDetail(h)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Yazdır">
                            <IconButton size="small" onClick={() => handlePrint(h)}>
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {isManager && (
                            <Tooltip title="Sil">
                              <IconButton size="small" color="error"
                                onClick={() => setDeleteDialog({ open: true, id: h.id })}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <PaginationBar total={histTotal} page={histPage} pageSize={histPageSize} onPageChange={setHistPage} onPageSizeChange={(s) => { setHistPageSize(s); setHistPage(1); }} />
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ── Harç Kalemi Oluştur / Düzenle Dialog ── */}
      <Dialog open={rateDialogOpen} onClose={() => setRateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {rateEditId ? <EditIcon /> : <AddIcon />}
          {rateEditId ? 'Harç Kalemi Düzenle' : 'Yeni Harç Kalemi'}
        </DialogTitle>
        <DialogContent dividers>
          {rateError && <Alert severity="error" sx={{ mb: 2 }}>{rateError}</Alert>}
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              select fullWidth label="Harç Kategorisi (opsiyonel)"
              value={rateForm.categoryId}
              onChange={e => setRateForm(p => ({ ...p, categoryId: e.target.value }))}
            >
              <MenuItem value=""><em>Kategori yok</em></MenuItem>
              {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <TextField
              label="Harç Türü" required fullWidth
              value={rateForm.harcTuru}
              onChange={e => setRateForm(p => ({ ...p, harcTuru: e.target.value }))}
            />
            <TextField
              label="Birim Harç (TL/m²)" required fullWidth type="number"
              inputProps={{ step: '0.01', min: '0' }}
              value={rateForm.birimHarc}
              onChange={e => setRateForm(p => ({ ...p, birimHarc: e.target.value }))}
            />
            <TextField
              label="Katsayı (opsiyonel, örn: 0.3)" fullWidth type="number"
              inputProps={{ step: '0.01', min: '0' }}
              helperText="Girilirse: Alan × Birim Harç × Katsayı şeklinde hesaplanır"
              value={rateForm.katsayi}
              onChange={e => setRateForm(p => ({ ...p, katsayi: e.target.value }))}
            />
            <TextField
              label="Açıklama (opsiyonel)" fullWidth
              value={rateForm.aciklama}
              onChange={e => setRateForm(p => ({ ...p, aciklama: e.target.value }))}
            />
            <TextField
              label="Sıra No" fullWidth type="number"
              inputProps={{ min: '0' }}
              value={rateForm.siraNo}
              onChange={e => setRateForm(p => ({ ...p, siraNo: e.target.value }))}
            />
            {rateEditId && (
              <FormControlLabel
                control={
                  <Switch
                    checked={rateForm.isActive}
                    onChange={e => setRateForm(p => ({ ...p, isActive: e.target.checked }))}
                    color="success"
                  />
                }
                label={rateForm.isActive ? 'Aktif' : 'Pasif'}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateDialogOpen(false)}>İptal</Button>
          <Button onClick={handleSaveRate} variant="contained" disabled={rateSaving}>
            {rateSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Harç Kalemi Silme Onay ── */}
      <Dialog open={rateDeleteDialog.open} onClose={() => setRateDeleteDialog({ open: false, id: null })}>
        <DialogTitle>Harç Kalemini Sil</DialogTitle>
        <DialogContent>
          <Typography>Bu harç kalemini silmek istediğinizden emin misiniz?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateDeleteDialog({ open: false, id: null })}>İptal</Button>
          <Button color="error" variant="contained" onClick={handleDeleteRate}>Sil</Button>
        </DialogActions>
      </Dialog>

      {/* ── Kategori Oluştur / Düzenle Dialog ── */}
      <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {catEditId ? <EditIcon /> : <AddIcon />}
          {catEditId ? 'Kategori Düzenle' : 'Yeni Harç Kategorisi'}
        </DialogTitle>
        <DialogContent dividers>
          {catError && <Alert severity="error" sx={{ mb: 2 }}>{catError}</Alert>}
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField label="Kategori Adı" required fullWidth value={catForm.name}
              onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} />
            <TextField label="Açıklama (opsiyonel)" fullWidth value={catForm.description}
              onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} />
            <TextField label="Sıra No" fullWidth type="number" inputProps={{ min: '0' }}
              value={catForm.siraNo}
              onChange={e => setCatForm(p => ({ ...p, siraNo: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDialogOpen(false)}>İptal</Button>
          <Button onClick={handleSaveCat} variant="contained" disabled={catSaving}>
            {catSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Kategori Silme Onay ── */}
      <Dialog open={catDeleteDialog.open} onClose={() => setCatDeleteDialog({ open: false, id: null })}>
        <DialogTitle>Kategoriyi Sil</DialogTitle>
        <DialogContent>
          <Typography>Bu kategoriyi silmek istediğinizden emin misiniz? Altındaki harç kalemleri kategorisiz kalacak.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDeleteDialog({ open: false, id: null })}>İptal</Button>
          <Button color="error" variant="contained" onClick={handleDeleteCat}>Sil</Button>
        </DialogActions>
      </Dialog>

      {/* ── Detay Dialog ── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Harç Hesaplama Detayı</DialogTitle>
        <DialogContent>
          {selectedCalc && (
            <Box>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Harç Türü</Typography>
                  <Typography fontWeight={600}>{selectedCalc.harcTuru}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Hesaplayan</Typography>
                  <Typography>{selectedCalc.hesaplayanKullanici || '—'}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Ada</Typography>
                  <Typography>{selectedCalc.ada}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Parsel</Typography>
                  <Typography>{selectedCalc.parsel}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Mahalle</Typography>
                  <Typography>{selectedCalc.mahalle}</Typography>
                </Grid>
                {selectedCalc.malikAdi && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Malik</Typography>
                    <Typography>{selectedCalc.malikAdi}</Typography>
                  </Grid>
                )}
                <Grid item xs={12}><Divider /></Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Alan</Typography>
                  <Typography>{selectedCalc.alanM2} m²</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Birim Harç</Typography>
                  <Typography>{selectedCalc.birimHarc} TL/m²</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Toplam Harç</Typography>
                  <Typography variant="h6" color="primary" fontWeight={700}>
                    {formatCurrency(selectedCalc.toplamHarc)}
                  </Typography>
                </Grid>
                {selectedCalc.notlar && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Notlar</Typography>
                    <Typography>{selectedCalc.notlar}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDetailOpen(false); if (selectedCalc) handlePrint(selectedCalc); }}
            startIcon={<PrintIcon />}>
            Yazdır
          </Button>
          <Button onClick={() => setDetailOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* ── Hesaplama Silme Onay Dialog ── */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
        <DialogTitle>Kaydı Sil</DialogTitle>
        <DialogContent>
          <Typography>Bu harç hesaplama kaydını silmek istediğinizden emin misiniz?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>İptal</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Sil</Button>
        </DialogActions>
      </Dialog>

      {/* ── Yazdırma Alanı ── */}
      {selectedCalc && (
        <Box ref={printRef} sx={{ display: 'none', '@media print': { display: 'block' } }}>
          <Box sx={{ p: 4, fontFamily: 'serif' }}>
            <Typography variant="h5" align="center" gutterBottom>
              ÇAYIROVA BELEDİYESİ
            </Typography>
            <Typography variant="subtitle1" align="center" gutterBottom>
              İmar ve Şehircilik Müdürlüğü — Harç Hesaplama Belgesi
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}><b>Ada:</b> {selectedCalc.ada}</Grid>
              <Grid item xs={6}><b>Parsel:</b> {selectedCalc.parsel}</Grid>
              <Grid item xs={6}><b>Mahalle:</b> {selectedCalc.mahalle}</Grid>
              <Grid item xs={6}><b>Malik:</b> {selectedCalc.malikAdi || '—'}</Grid>
              <Grid item xs={12}><b>Harç Türü:</b> {selectedCalc.harcTuru}</Grid>
              <Grid item xs={4}><b>Alan:</b> {selectedCalc.alanM2} m²</Grid>
              <Grid item xs={4}><b>Birim Harç:</b> {selectedCalc.birimHarc} TL/m²</Grid>
              <Grid item xs={4}><b>Toplam Harç:</b> {formatCurrency(selectedCalc.toplamHarc)}</Grid>
              {selectedCalc.notlar && (
                <Grid item xs={12}><b>Notlar:</b> {selectedCalc.notlar}</Grid>
              )}
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption">
              Hesaplayan: {selectedCalc.hesaplayanKullanici || '—'} &nbsp;|&nbsp;
              Tarih: {formatDate(selectedCalc.hesaplamaTarihi)}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
