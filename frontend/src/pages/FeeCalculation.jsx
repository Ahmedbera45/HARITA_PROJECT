import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Chip, Divider, IconButton, Tooltip, Switch, FormControlLabel,
  Stack,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import feeService from '../services/feeService';
import { useAuth } from '../hooks/useAuth';

const formatCurrency = (val) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

const formatDate = (d) =>
  new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

const EMPTY_RATE_FORM = { ruhsatTuru: '', birimHarc: '', katsayi: '', aciklama: '', siraNo: 0, isActive: true };

export default function FeeCalculation() {
  const { isManager } = useAuth();

  const [rates, setRates] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    ruhsatTuru: '', alanM2: '', ada: '', parsel: '', mahalle: '', malikAdi: '', notlar: '',
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

  const printRef = useRef();

  useEffect(() => {
    loadRates();
    loadHistory();
  }, []);

  const loadRates = () => {
    feeService.getRates()
      .then(setRates)
      .catch(() => {});
  };

  const loadHistory = () => {
    setHistLoading(true);
    feeService.getAll()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setHistLoading(false));
  };

  const activeRates = rates.filter(r => r.isActive);
  const selectedRate = activeRates.find(r => r.ruhsatTuru === form.ruhsatTuru);
  const katsayi = selectedRate?.katsayi ?? 1;
  const previewAmount =
    selectedRate && parseFloat(form.alanM2) > 0
      ? Math.round(parseFloat(form.alanM2) * selectedRate.birimHarc * katsayi * 100) / 100
      : null;

  const handleCalculate = async () => {
    setError('');
    setSuccess('');
    if (!form.ruhsatTuru || !form.alanM2 || !form.ada || !form.parsel || !form.mahalle) {
      setError('Ruhsat Türü, Alan, Ada, Parsel ve Mahalle zorunlu alanlardır.');
      return;
    }
    setLoading(true);
    try {
      const data = await feeService.calculate({
        ruhsatTuru: form.ruhsatTuru,
        alanM2: parseFloat(form.alanM2),
        ada: form.ada,
        parsel: form.parsel,
        mahalle: form.mahalle,
        malikAdi: form.malikAdi || null,
        notlar: form.notlar || null,
      });
      setPreview(data);
      setSuccess('Harç hesaplaması başarıyla kaydedildi.');
      setForm({ ruhsatTuru: '', alanM2: '', ada: '', parsel: '', mahalle: '', malikAdi: '', notlar: '' });
      loadHistory();
    } catch (e) {
      setError(e.response?.data?.message || 'Hesaplama sırasında hata oluştu.');
    } finally {
      setLoading(false);
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
      ruhsatTuru: rate.ruhsatTuru,
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
    if (!rateForm.ruhsatTuru.trim() || !rateForm.birimHarc) {
      setRateError('Ruhsat Türü ve Birim Harç zorunludur.');
      return;
    }
    setRateSaving(true);
    setRateError('');
    try {
      const payload = {
        ruhsatTuru: rateForm.ruhsatTuru,
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

            <TextField
              select fullWidth label="Ruhsat Türü" value={form.ruhsatTuru}
              onChange={e => setForm(p => ({ ...p, ruhsatTuru: e.target.value }))}
              sx={{ mb: 2 }}
            >
              {activeRates.map(r => (
                <MenuItem key={r.id} value={r.ruhsatTuru}>
                  <Box>
                    <Typography variant="body2">{r.ruhsatTuru}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.birimHarc} TL/m²
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

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
                <Button
                  size="small"
                  startIcon={<SettingsIcon />}
                  onClick={openCreateRate}
                  variant="outlined"
                >
                  Yeni Kalem
                </Button>
              )}
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ruhsat Türü</TableCell>
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
                        <Typography variant="body2">{r.ruhsatTuru}</Typography>
                        {r.aciklama && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {r.aciklama}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={`${r.birimHarc} TL/m²`} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        {r.katsayi != null
                          ? <Chip label={r.katsayi} size="small" color="warning" variant="outlined" />
                          : <Typography variant="caption" color="text.disabled">—</Typography>}
                      </TableCell>
                      {isManager && (
                        <TableCell align="center">
                          <Chip
                            label={r.isActive ? 'Aktif' : 'Pasif'}
                            size="small"
                            color={r.isActive ? 'success' : 'default'}
                          />
                        </TableCell>
                      )}
                      {isManager && (
                        <TableCell align="center">
                          <Tooltip title="Düzenle">
                            <IconButton size="small" color="primary" onClick={() => openEditRate(r)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Sil">
                            <IconButton size="small" color="error"
                              onClick={() => setRateDeleteDialog({ open: true, id: r.id })}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
                      <TableCell>Ruhsat Türü</TableCell>
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
                          <Typography variant="body2" fontWeight={500}>{h.ruhsatTuru}</Typography>
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
              label="Ruhsat Türü" required fullWidth
              value={rateForm.ruhsatTuru}
              onChange={e => setRateForm(p => ({ ...p, ruhsatTuru: e.target.value }))}
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

      {/* ── Detay Dialog ── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Harç Hesaplama Detayı</DialogTitle>
        <DialogContent>
          {selectedCalc && (
            <Box>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Ruhsat Türü</Typography>
                  <Typography fontWeight={600}>{selectedCalc.ruhsatTuru}</Typography>
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
              <Grid item xs={12}><b>Ruhsat Türü:</b> {selectedCalc.ruhsatTuru}</Grid>
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
