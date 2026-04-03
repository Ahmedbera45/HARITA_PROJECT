import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Stack, TextField, Select, MenuItem,
  FormControl, InputLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress, Alert, Chip,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import dynamicPageService from '../services/dynamicPageService';
import { useAuth } from '../hooks/useAuth';

const TYPE_LABELS = { text: 'Metin', number: 'Sayı', date: 'Tarih' };

export default function DynamicPageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const fileRef = useRef();

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Arama
  const [searchText, setSearchText] = useState('');
  const [searchColumn, setSearchColumn] = useState('');

  // Satır dialog
  const [rowDialog, setRowDialog] = useState({ open: false, row: null });
  const [rowForm, setRowForm] = useState({});
  const [rowSaving, setRowSaving] = useState(false);

  // Kolon ekleme dialog
  const [colDialog, setColDialog] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('text');
  const [colSaving, setColSaving] = useState(false);

  // Silme
  const [deleteRowDialog, setDeleteRowDialog] = useState({ open: false, rowId: null });

  // Import
  const [importing, setImporting] = useState(false);

  useEffect(() => { loadPage(); }, [id]);

  const loadPage = (search, column) => {
    setLoading(true);
    dynamicPageService.getPage(id, search || searchText || undefined, column || searchColumn || undefined)
      .then(setPage)
      .catch(() => setError('Sayfa yüklenemedi'))
      .finally(() => setLoading(false));
  };

  const handleSearch = () => loadPage(searchText, searchColumn);

  // ── Satır ────────────────────────────────────────────────────────
  const openAddRow = () => {
    const empty = {};
    page.columns.forEach(c => { empty[c.name] = ''; });
    setRowForm(empty);
    setRowDialog({ open: true, row: null });
  };

  const openEditRow = (row) => {
    setRowForm({ ...row.data });
    setRowDialog({ open: true, row });
  };

  const handleSaveRow = async () => {
    setRowSaving(true);
    try {
      if (rowDialog.row) {
        await dynamicPageService.updateRow(id, rowDialog.row.id, { data: rowForm });
      } else {
        await dynamicPageService.addRow(id, { data: rowForm });
      }
      setSuccess(rowDialog.row ? 'Satır güncellendi.' : 'Satır eklendi.');
      setRowDialog({ open: false, row: null });
      loadPage();
    } catch (e) {
      setError(e.response?.data?.message || 'Kayıt hatası.');
    } finally {
      setRowSaving(false);
    }
  };

  const handleDeleteRow = async () => {
    try {
      await dynamicPageService.deleteRow(id, deleteRowDialog.rowId);
      setSuccess('Satır silindi.');
      setDeleteRowDialog({ open: false, rowId: null });
      loadPage();
    } catch {
      setError('Silme başarısız.');
    }
  };

  // ── Kolon ────────────────────────────────────────────────────────
  const handleAddColumn = async () => {
    if (!newColName.trim()) return;
    setColSaving(true);
    try {
      await dynamicPageService.addColumn(id, { name: newColName.trim(), type: newColType });
      setSuccess('Sütun eklendi.');
      setColDialog(false);
      setNewColName('');
      loadPage();
    } catch (e) {
      setError(e.response?.data?.message || 'Sütun eklenemedi.');
    } finally {
      setColSaving(false);
    }
  };

  // ── Import ───────────────────────────────────────────────────────
  const handleImport = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImporting(true);
    try {
      const result = await dynamicPageService.importRows(id, f);
      setSuccess(`${result.successRows} satır yüklendi (Batch: ${result.batchId})`);
      loadPage();
    } catch (err) {
      setError(err.response?.data?.message || 'Import başarısız.');
    } finally {
      setImporting(false);
      fileRef.current.value = '';
    }
  };

  if (loading && !page) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      {/* Başlık */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <IconButton onClick={() => navigate(isManager ? '/pages' : '/dashboard')}><ArrowBackIcon /></IconButton>
        <Typography variant="h5" fontWeight={700}>{page?.title}</Typography>
        {page && <Chip label={`${page.rowCount} satır`} size="small" />}
        {page && page.columns && <Chip label={`${page.columns.length} sütun`} size="small" variant="outlined" />}
      </Stack>

      {page?.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{page.description}</Typography>
      )}

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      {/* Araç çubuğu */}
      <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
        {/* Arama */}
        {page && page.columns && (
          <>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Sütun</InputLabel>
              <Select label="Sütun" value={searchColumn} onChange={e => setSearchColumn(e.target.value)}>
                <MenuItem value="">Tümü</MenuItem>
                {page.columns.map(c => <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" placeholder="Ara..." value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              sx={{ width: 200 }} />
            <Button variant="outlined" size="small" startIcon={<SearchIcon />} onClick={handleSearch}>Ara</Button>
            {(searchText || searchColumn) && (
              <Button size="small" onClick={() => { setSearchText(''); setSearchColumn(''); loadPage('', ''); }}>
                Temizle
              </Button>
            )}
          </>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {isManager && (
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImport} />
            <Button size="small" variant="outlined" startIcon={importing ? <CircularProgress size={16} /> : <UploadFileIcon />}
              onClick={() => fileRef.current.click()} disabled={importing}>
              Excel Yükle
            </Button>
            <Button size="small" variant="outlined" startIcon={<AddIcon />}
              onClick={() => setColDialog(true)}>
              Sütun Ekle
            </Button>
            <Button size="small" variant="contained" startIcon={<AddIcon />}
              onClick={openAddRow} disabled={!page?.columns?.length}>
              Satır Ekle
            </Button>
          </>
        )}
      </Stack>

      {/* Tablo */}
      {page && page.columns && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                {page.columns.map(c => (
                  <TableCell key={c.id} sx={{ color: 'white', fontWeight: 600 }}>
                    {c.name}
                    <Typography variant="caption" sx={{ display: 'block', opacity: 0.7 }}>
                      {TYPE_LABELS[c.type] || c.type}
                    </Typography>
                  </TableCell>
                ))}
                {isManager && <TableCell sx={{ color: 'white', fontWeight: 600 }}>İşlem</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={page.columns.length + 1} align="center"><CircularProgress size={24} /></TableCell></TableRow>
              ) : page.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={page.columns.length + 1} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Veri bulunamadı
                  </TableCell>
                </TableRow>
              ) : page.rows.map(row => (
                <TableRow key={row.id} hover>
                  {page.columns.map(c => (
                    <TableCell key={c.id}>{row.data[c.name] ?? ''}</TableCell>
                  ))}
                  {isManager && (
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Düzenle">
                          <IconButton size="small" onClick={() => openEditRow(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sil">
                          <IconButton size="small" color="error"
                            onClick={() => setDeleteRowDialog({ open: true, rowId: row.id })}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Satır Ekle/Düzenle Dialog ─── */}
      <Dialog open={rowDialog.open} onClose={() => setRowDialog({ open: false, row: null })}
        maxWidth="sm" fullWidth>
        <DialogTitle>{rowDialog.row ? 'Satır Düzenle' : 'Satır Ekle'}</DialogTitle>
        <DialogContent dividers>
          {page && page.columns && (
            <Grid container spacing={2}>
              {page.columns.map(col => (
                <Grid item xs={12} sm={6} key={col.id}>
                  <TextField
                    fullWidth
                    label={col.name}
                    size="small"
                    type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                    value={rowForm[col.name] ?? ''}
                    onChange={e => setRowForm(f => ({ ...f, [col.name]: e.target.value }))}
                    InputLabelProps={col.type === 'date' ? { shrink: true } : undefined}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRowDialog({ open: false, row: null })}>İptal</Button>
          <Button variant="contained" onClick={handleSaveRow} disabled={rowSaving}>
            {rowSaving ? <CircularProgress size={20} /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Kolon Ekle Dialog ─── */}
      <Dialog open={colDialog} onClose={() => setColDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Sütun Ekle</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField fullWidth label="Sütun Adı" size="small" value={newColName}
              onChange={e => setNewColName(e.target.value)} />
            <FormControl fullWidth size="small">
              <InputLabel>Tip</InputLabel>
              <Select label="Tip" value={newColType} onChange={e => setNewColType(e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([v, l]) =>
                  <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColDialog(false)}>İptal</Button>
          <Button variant="contained" onClick={handleAddColumn} disabled={colSaving || !newColName.trim()}>
            {colSaving ? <CircularProgress size={20} /> : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Satır Sil Onayı ─── */}
      <Dialog open={deleteRowDialog.open} onClose={() => setDeleteRowDialog({ open: false, rowId: null })}>
        <DialogTitle>Satır Sil</DialogTitle>
        <DialogContent>
          <Typography>Bu satırı silmek istediğinizden emin misiniz?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteRowDialog({ open: false, rowId: null })}>İptal</Button>
          <Button color="error" variant="contained" onClick={handleDeleteRow}>Sil</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
