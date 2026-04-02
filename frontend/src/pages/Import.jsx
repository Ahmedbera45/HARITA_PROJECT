import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Alert, LinearProgress,
  TextField, InputAdornment, Stack, Tabs, Tab, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
} from '@mui/material';
import {
  CloudUpload, History, Search, CheckCircle, Error as ErrorIcon,
  TableChart, FileDownload, Edit as EditIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import importService from '../services/importService';
import { useAuth } from '../hooks/useAuth';

const fmt = (d) => d ? new Date(d).toLocaleString('tr-TR') : '-';
const fmtCurrency = (val) =>
  val != null
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val)
    : '-';

const EMPTY_PARCEL_FORM = {
  ada: '', parsel: '', mahalle: '', mevkii: '', alan: '', nitelik: '', malikAdi: '', paftaNo: '', rayicBedel: '', yolGenisligi: '',
};

export default function Import() {
  const { isManager } = useAuth();
  // Staff kullanıcılar doğrudan Parsel Listesi'nden başlar
  const [tab, setTab] = useState(isManager ? 0 : 2);

  // Upload state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const fileInputRef = useRef();

  // Log state
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Parcel state
  const [parcels, setParcels] = useState([]);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [mahalleFilter, setMahalleFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');

  // Parcel edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editParcelId, setEditParcelId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_PARCEL_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (tab === 1) fetchLogs();
    if (tab === 2) fetchParcels();
  }, [tab]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try { setLogs(await importService.getLogs()); }
    catch { toast.error('Geçmiş yüklenemedi.'); }
    finally { setLoadingLogs(false); }
  };

  const fetchParcels = async (params = {}) => {
    setLoadingParcels(true);
    try { setParcels(await importService.getParcels(params)); }
    catch { toast.error('Parseller yüklenemedi.'); }
    finally { setLoadingParcels(false); }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      toast.warning('Sadece .xlsx veya .xls dosyaları kabul edilmektedir.');
      return;
    }
    setFile(f);
    setLastResult(null);
  };

  const handleUpload = async () => {
    if (!file) { toast.warning('Önce dosya seçin.'); return; }
    setUploading(true);
    try {
      const result = await importService.importParcels(file);
      setLastResult(result);
      if (result.errorRows === 0) {
        toast.success(`${result.successRows} parsel başarıyla içe aktarıldı.`);
      } else {
        toast.warning(`${result.successRows} başarılı, ${result.errorRows} hatalı satır.`);
      }
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      toast.error(e.response?.data || 'Yükleme başarısız.');
    } finally { setUploading(false); }
  };

  const handleParcelSearch = () => {
    fetchParcels({
      ...(mahalleFilter && { mahalle: mahalleFilter }),
      ...(batchFilter && { batchId: batchFilter })
    });
  };

  const downloadTemplate = () => {
    // Excel'in açabileceği HTML tablo formatı (.xls)
    const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Parseller</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body><table border="1">
<tr style="background:#1976d2;color:white;font-weight:bold">
  <td>Ada</td><td>Parsel</td><td>Mahalle</td><td>Mevkii</td><td>Alan</td>
  <td>Nitelik</td><td>MalikAdi</td><td>PaftaNo</td><td>RayicBedel</td><td>YolGenisligi</td>
</tr>
<tr><td>100</td><td>1</td><td>Merkez</td><td>Aşağı Mah.</td><td>500</td><td>Arsa</td><td>Ali Veli</td><td>10-B</td><td>250000</td><td>15+</td></tr>
<tr><td>200</td><td>5</td><td>Fatih</td><td>Yukarı Mah.</td><td>320</td><td>Konut</td><td>Ayşe Kaya</td><td>12-C</td><td>180000</td><td>10-15</td></tr>
<tr><td>305</td><td>12</td><td>Cumhuriyet</td><td></td><td>750</td><td>Tarla</td><td></td><td>8-A</td><td></td><td>7m</td></tr>
</table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'parsel_sablonu.xls'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Parsel düzenleme ──────────────────────────────────────────────
  const openEditParcel = (p) => {
    setEditParcelId(p.id);
    setEditForm({
      ada: p.ada,
      parsel: p.parsel,
      mahalle: p.mahalle,
      mevkii: p.mevkii || '',
      alan: p.alan != null ? p.alan : '',
      nitelik: p.nitelik || '',
      malikAdi: p.malikAdi || '',
      paftaNo: p.paftaNo || '',
      rayicBedel: p.rayicBedel != null ? p.rayicBedel : '',
      yolGenisligi: p.yolGenisligi || '',
    });
    setEditError('');
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.ada.trim() || !editForm.parsel.trim() || !editForm.mahalle.trim()) {
      setEditError('Ada, Parsel ve Mahalle zorunludur.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      await importService.updateParcel(editParcelId, {
        ada: editForm.ada,
        parsel: editForm.parsel,
        mahalle: editForm.mahalle,
        mevkii: editForm.mevkii || null,
        alan: editForm.alan !== '' ? parseFloat(editForm.alan) : null,
        nitelik: editForm.nitelik || null,
        malikAdi: editForm.malikAdi || null,
        paftaNo: editForm.paftaNo || null,
        rayicBedel: editForm.rayicBedel !== '' ? parseFloat(editForm.rayicBedel) : null,
        yolGenisligi: editForm.yolGenisligi || null,
      });
      toast.success('Parsel güncellendi.');
      setEditDialog(false);
      fetchParcels({
        ...(mahalleFilter && { mahalle: mahalleFilter }),
        ...(batchFilter && { batchId: batchFilter })
      });
    } catch (e) {
      setEditError(e.response?.data?.message || 'Güncelleme başarısız.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Excel Veri İçe Aktarma</Typography>
        <Typography variant="body2" color="text.secondary">Parsel ve ruhsat verilerini Excel ile toplu yükleyin</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        {isManager && <Tab value={0} label="Yükle" icon={<CloudUpload />} iconPosition="start" />}
        {isManager && <Tab value={1} label="Geçmiş" icon={<History />} iconPosition="start" />}
        <Tab value={2} label="Parsel Listesi" icon={<TableChart />} iconPosition="start" />
      </Tabs>

      {/* ─── TAB 0: YÜKLE ─── */}
      {tab === 0 && (
        <Stack spacing={3}>
          <Paper elevation={0} sx={{ p: 4, border: '2px dashed', borderColor: file ? 'primary.main' : 'divider', borderRadius: 3, textAlign: 'center' }}>
            <CloudUpload sx={{ fontSize: 56, color: file ? 'primary.main' : 'text.disabled', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              {file ? file.name : 'Excel Dosyası Seçin'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {file ? `${(file.size / 1024).toFixed(1)} KB` : '.xlsx veya .xls — maksimum 10 MB'}
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                Dosya Seç
              </Button>
              <Button variant="contained" onClick={handleUpload} disabled={!file || uploading} startIcon={<CloudUpload />}>
                {uploading ? 'Yükleniyor...' : 'İçe Aktar'}
              </Button>
              <Tooltip title="CSV formatında şablon indir">
                <Button variant="text" startIcon={<FileDownload />} onClick={downloadTemplate}>
                  Şablon
                </Button>
              </Tooltip>
            </Stack>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
            {uploading && <LinearProgress sx={{ mt: 2 }} />}
          </Paper>

          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <strong>Excel sütun başlıkları (zorunlu: Ada, Parsel, Mahalle):</strong><br />
            Ada | Parsel | Mahalle | Mevkii | Alan (m²) | Nitelik | MalikAdi | PaftaNo | RayicBedel | <strong>YolGenisligi</strong>
            <br /><Typography variant="caption" color="text.secondary">Örn: YolGenisligi → "15+", "10-15", "7m"</Typography>
          </Alert>

          {lastResult && (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: lastResult.errorRows > 0 ? 'warning.main' : 'success.main', borderRadius: 2 }}>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Chip icon={<CheckCircle />} label={`${lastResult.successRows} başarılı`} color="success" />
                {lastResult.errorRows > 0 && (
                  <Chip icon={<ErrorIcon />} label={`${lastResult.errorRows} hatalı`} color="error" />
                )}
                <Chip label={`Batch: ${lastResult.batchId}`} size="small" variant="outlined" />
              </Stack>
              {lastResult.errors.length > 0 && (
                <Box sx={{ maxHeight: 160, overflowY: 'auto' }}>
                  {lastResult.errors.map((e, i) => (
                    <Typography key={i} variant="caption" color="error" sx={{ display: 'block' }}>• {e}</Typography>
                  ))}
                </Box>
              )}
            </Paper>
          )}
        </Stack>
      )}

      {/* ─── TAB 1: GEÇMİŞ ─── */}
      {tab === 1 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell><strong>Dosya Adı</strong></TableCell>
                <TableCell><strong>Batch ID</strong></TableCell>
                <TableCell><strong>Toplam</strong></TableCell>
                <TableCell><strong>Başarılı</strong></TableCell>
                <TableCell><strong>Hatalı</strong></TableCell>
                <TableCell><strong>Yükleyen</strong></TableCell>
                <TableCell><strong>Tarih</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingLogs ? (
                <TableRow><TableCell colSpan={7} align="center"><LinearProgress /></TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>Henüz içe aktarma yapılmamış</TableCell></TableRow>
              ) : logs.map(l => (
                <TableRow key={l.id} hover>
                  <TableCell>{l.fileName}</TableCell>
                  <TableCell><Chip label={l.batchId} size="small" variant="outlined" /></TableCell>
                  <TableCell>{l.totalRows}</TableCell>
                  <TableCell><Chip label={l.successRows} size="small" color="success" /></TableCell>
                  <TableCell>
                    {l.errorRows > 0
                      ? <Chip label={l.errorRows} size="small" color="error" />
                      : <Chip label="0" size="small" color="default" />}
                  </TableCell>
                  <TableCell>{l.importedBy}</TableCell>
                  <TableCell>{fmt(l.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ─── TAB 2: PARSEL LİSTESİ ─── */}
      {tab === 2 && (
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Mahalle Ara" size="small" sx={{ minWidth: 200 }}
              value={mahalleFilter}
              onChange={e => setMahalleFilter(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
              onKeyDown={e => e.key === 'Enter' && handleParcelSearch()}
            />
            <TextField
              label="Batch ID" size="small" sx={{ minWidth: 200 }}
              value={batchFilter}
              onChange={e => setBatchFilter(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleParcelSearch()}
            />
            <Button variant="outlined" onClick={handleParcelSearch}>Ara</Button>
            <Button variant="text" onClick={() => { setMahalleFilter(''); setBatchFilter(''); fetchParcels(); }}>Temizle</Button>
          </Stack>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  {['Ada', 'Parsel', 'Mahalle', 'Mevkii', 'Alan (m²)', 'Nitelik', 'Malik Adı', 'Pafta No', 'Rayiç Bedel', 'Yol Gen.', 'Batch'].map(h => (
                    <TableCell key={h}><strong>{h}</strong></TableCell>
                  ))}
                  {isManager && <TableCell align="center"><strong>İşlem</strong></TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingParcels ? (
                  <TableRow><TableCell colSpan={isManager ? 12 : 11} align="center"><LinearProgress /></TableCell></TableRow>
                ) : parcels.length === 0 ? (
                  <TableRow><TableCell colSpan={isManager ? 12 : 11} align="center" sx={{ color: 'text.secondary', py: 4 }}>Parsel bulunamadı</TableCell></TableRow>
                ) : parcels.map(p => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.ada}</TableCell>
                    <TableCell>{p.parsel}</TableCell>
                    <TableCell>{p.mahalle}</TableCell>
                    <TableCell>{p.mevkii || '-'}</TableCell>
                    <TableCell>{p.alan != null ? p.alan.toLocaleString('tr-TR') : '-'}</TableCell>
                    <TableCell>{p.nitelik || '-'}</TableCell>
                    <TableCell>{p.malikAdi || '-'}</TableCell>
                    <TableCell>{p.paftaNo || '-'}</TableCell>
                    <TableCell>
                      {p.rayicBedel != null
                        ? <Chip label={fmtCurrency(p.rayicBedel)} size="small" color="success" variant="outlined" />
                        : <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell>
                      {p.yolGenisligi
                        ? <Chip label={p.yolGenisligi} size="small" color="info" variant="outlined" />
                        : <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell><Chip label={p.importBatchId} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></TableCell>
                    {isManager && (
                      <TableCell align="center">
                        <Tooltip title="Düzenle">
                          <IconButton size="small" color="primary" onClick={() => openEditParcel(p)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary">{parcels.length} kayıt listeleniyor</Typography>
        </Stack>
      )}

      {/* ── Parsel Düzenleme Dialog ── */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon /> Parsel Düzenle
        </DialogTitle>
        <DialogContent dividers>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Ada" required fullWidth
                value={editForm.ada}
                onChange={e => setEditForm(p => ({ ...p, ada: e.target.value }))}
              />
              <TextField
                label="Parsel" required fullWidth
                value={editForm.parsel}
                onChange={e => setEditForm(p => ({ ...p, parsel: e.target.value }))}
              />
            </Stack>
            <TextField
              label="Mahalle" required fullWidth
              value={editForm.mahalle}
              onChange={e => setEditForm(p => ({ ...p, mahalle: e.target.value }))}
            />
            <TextField
              label="Mevkii" fullWidth
              value={editForm.mevkii}
              onChange={e => setEditForm(p => ({ ...p, mevkii: e.target.value }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Alan (m²)" fullWidth type="number"
                inputProps={{ step: '0.01', min: '0' }}
                value={editForm.alan}
                onChange={e => setEditForm(p => ({ ...p, alan: e.target.value }))}
              />
              <TextField
                label="Rayiç Bedel (TL)" fullWidth type="number"
                inputProps={{ step: '0.01', min: '0' }}
                value={editForm.rayicBedel}
                onChange={e => setEditForm(p => ({ ...p, rayicBedel: e.target.value }))}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Nitelik" fullWidth
                value={editForm.nitelik}
                onChange={e => setEditForm(p => ({ ...p, nitelik: e.target.value }))}
              />
              <TextField
                label="Pafta No" fullWidth
                value={editForm.paftaNo}
                onChange={e => setEditForm(p => ({ ...p, paftaNo: e.target.value }))}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Malik Adı" fullWidth
                value={editForm.malikAdi}
                onChange={e => setEditForm(p => ({ ...p, malikAdi: e.target.value }))}
              />
              <TextField
                label="Yol Genişliği (örn: 15+)" fullWidth
                value={editForm.yolGenisligi}
                onChange={e => setEditForm(p => ({ ...p, yolGenisligi: e.target.value }))}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>İptal</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={editSaving}>
            {editSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
