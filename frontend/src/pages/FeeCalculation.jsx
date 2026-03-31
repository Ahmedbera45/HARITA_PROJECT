import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Alert, Chip, Divider, IconButton, Tooltip,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import feeService from '../services/feeService';

const formatCurrency = (val) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

const formatDate = (d) =>
  new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

export default function FeeCalculation() {
  const [rates, setRates] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    ruhsatTuru: '', alanM2: '', ada: '', parsel: '', mahalle: '', malikAdi: '', notlar: '',
  });

  const [preview, setPreview] = useState(null); // calculated result before save
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCalc, setSelectedCalc] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  const printRef = useRef();

  useEffect(() => {
    feeService.getRates()
      .then(r => setRates(r.data))
      .catch(() => {});
    loadHistory();
  }, []);

  const loadHistory = () => {
    setHistLoading(true);
    feeService.getAll()
      .then(r => setHistory(r.data))
      .catch(() => {})
      .finally(() => setHistLoading(false));
  };

  const selectedRate = rates.find(r => r.ruhsatTuru === form.ruhsatTuru);
  const previewAmount =
    selectedRate && parseFloat(form.alanM2) > 0
      ? Math.round(parseFloat(form.alanM2) * selectedRate.birimHarc * 100) / 100
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
      const { data } = await feeService.calculate({
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
              {rates.map(r => (
                <MenuItem key={r.ruhsatTuru} value={r.ruhsatTuru}>
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

            {/* Anlık Önizleme */}
            {previewAmount !== null && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'primary.50' }}>
                <Typography variant="caption" color="text.secondary">Tahmini Harç Tutarı</Typography>
                <Typography variant="h5" color="primary" fontWeight={700}>
                  {formatCurrency(previewAmount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {parseFloat(form.alanM2)} m² × {selectedRate?.birimHarc} TL/m²
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

          {/* Harç Tarifeleri */}
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="subtitle2" mb={1} color="text.secondary">
              2024 Yılı Harç Tarifesi
            </Typography>
            {rates.map(r => (
              <Box key={r.ruhsatTuru} display="flex" justifyContent="space-between" py={0.5}>
                <Typography variant="body2">{r.ruhsatTuru}</Typography>
                <Chip label={`${r.birimHarc} TL/m²`} size="small" color="primary" variant="outlined" />
              </Box>
            ))}
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
                          <Tooltip title="Sil">
                            <IconButton size="small" color="error"
                              onClick={() => setDeleteDialog({ open: true, id: h.id })}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
                  <Typography>{selectedCalc.hesaplayanKullanici}</Typography>
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

      {/* ── Silme Onay Dialog ── */}
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

      {/* ── Yazdırma Alanı (print:block) ── */}
      {selectedCalc && (
        <Box
          ref={printRef}
          sx={{ display: 'none', '@media print': { display: 'block' } }}
        >
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
              Hesaplayan: {selectedCalc.hesaplayanKullanici} &nbsp;|&nbsp;
              Tarih: {formatDate(selectedCalc.hesaplamaTarihi)}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
