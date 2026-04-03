import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Stepper, Step, StepLabel, Button, TextField,
  Grid, Stack, IconButton, Chip, Alert, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Select, MenuItem,
  FormControl, InputLabel, FormControlLabel, Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import dynamicPageService from '../services/dynamicPageService';

const STEPS = ['Sayfa Bilgisi', 'Sütun Tanımlama', 'Veri Yükle (Opsiyonel)'];

const TYPE_LABELS = { text: 'Metin', number: 'Sayı', date: 'Tarih' };

export default function DynamicPageCreate() {
  const navigate = useNavigate();
  const fileRef = useRef();

  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Adım 1
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [autoColumns, setAutoColumns] = useState(false);

  // Adım 2
  const [columns, setColumns] = useState([{ name: '', type: 'text' }]);

  // Adım 3
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Oluşturulan sayfa ID'si (adım 3'te import için)
  const [createdPageId, setCreatedPageId] = useState(null);

  const addColumn = () => setColumns(c => [...c, { name: '', type: 'text' }]);
  const removeColumn = (i) => setColumns(c => c.filter((_, idx) => idx !== i));
  const updateColumn = (i, field, val) =>
    setColumns(c => c.map((col, idx) => idx === i ? { ...col, [field]: val } : col));

  const handleNextStep1 = async () => {
    if (!title.trim()) { setError('Sayfa başlığı zorunludur.'); return; }
    setError('');
    if (autoColumns) {
      // Sütun tanımı olmadan sayfayı oluştur, direkt Excel yüklemeye geç
      setSaving(true);
      try {
        const page = await dynamicPageService.createPage({
          title: title.trim(),
          description: description.trim() || null,
          columns: [],
        });
        setCreatedPageId(page.id);
        setStep(2);
      } catch (e) {
        setError(e.response?.data?.message || 'Sayfa oluşturulamadı.');
      } finally {
        setSaving(false);
      }
    } else {
      setStep(1);
    }
  };

  const handleNextStep2 = async () => {
    const validCols = columns.filter(c => c.name.trim());
    if (validCols.length === 0) { setError('En az bir sütun tanımlanmalıdır.'); return; }
    setError('');
    setSaving(true);
    try {
      const page = await dynamicPageService.createPage({
        title: title.trim(),
        description: description.trim() || null,
        columns: validCols.map((c, i) => ({ name: c.name.trim(), type: c.type, order: i })),
      });
      setCreatedPageId(page.id);
      setStep(2);
    } catch (e) {
      setError(e.response?.data?.message || 'Sayfa oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!file || !createdPageId) return;
    setImporting(true);
    setError('');
    try {
      const result = await dynamicPageService.importRows(createdPageId, file);
      setImportResult(result);
    } catch (e) {
      setError(e.response?.data?.message || 'Import başarısız.');
    } finally {
      setImporting(false);
    }
  };

  const handleFinish = () => navigate(`/pages/${createdPageId}`);

  return (
    <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Yeni Özel Sayfa</Typography>

      <Stepper activeStep={autoColumns && step === 2 ? 1 : step} sx={{ mb: 4 }}>
        {(autoColumns ? ['Sayfa Bilgisi', 'Veri Yükle (Opsiyonel)'] : STEPS).map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {/* ─── Adım 1: Sayfa Bilgisi ─── */}
      {step === 0 && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Sayfa Başlığı *" value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Örn: Ruhsatlı Parseller" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Açıklama (opsiyonel)" value={description}
                onChange={e => setDescription(e.target.value)} multiline rows={2} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Checkbox checked={autoColumns} onChange={e => setAutoColumns(e.target.checked)} />}
                label="Sütunları Excel'den otomatik al (sütun tanımı adımını atla)"
              />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button variant="contained" onClick={handleNextStep1} disabled={saving}>
              {saving ? <CircularProgress size={20} /> : 'İleri'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* ─── Adım 2: Sütun Tanımlama ─── */}
      {step === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Sütunları tanımlayın</Typography>
          <Stack spacing={1.5}>
            {columns.map((col, i) => (
              <Stack direction="row" spacing={1} key={i} alignItems="center">
                <TextField
                  label={`Sütun ${i + 1} adı`}
                  size="small"
                  value={col.name}
                  onChange={e => updateColumn(i, 'name', e.target.value)}
                  sx={{ flex: 1 }}
                  placeholder="Örn: Ada, Ruhsat Tarihi"
                />
                <FormControl size="small" sx={{ minWidth: 110 }}>
                  <InputLabel>Tip</InputLabel>
                  <Select label="Tip" value={col.type}
                    onChange={e => updateColumn(i, 'type', e.target.value)}>
                    {Object.entries(TYPE_LABELS).map(([v, l]) =>
                      <MenuItem key={v} value={v}>{l}</MenuItem>)}
                  </Select>
                </FormControl>
                <IconButton size="small" color="error" onClick={() => removeColumn(i)}
                  disabled={columns.length === 1}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
          <Button startIcon={<AddIcon />} onClick={addColumn} sx={{ mt: 2 }} size="small">
            Sütun Ekle
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={() => setStep(0)}>Geri</Button>
            <Button variant="contained" onClick={handleNextStep2} disabled={saving}>
              {saving ? <CircularProgress size={20} /> : 'Sayfayı Oluştur'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* ─── Adım 3: Excel Yükle ─── */}
      {step === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Sayfa oluşturuldu. {autoColumns ? 'Excel yükleyerek sütunları otomatik oluşturabilirsiniz.' : 'İsterseniz veri yükleyin.'}
          </Typography>

          <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 3, textAlign: 'center', mb: 2 }}>
            <UploadFileIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              .xlsx veya .xls formatında Excel dosyası
            </Typography>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden
              onChange={e => { setFile(e.target.files[0]); setImportResult(null); }} />
            <Button variant="outlined" size="small" onClick={() => fileRef.current.click()}>
              Dosya Seç
            </Button>
            {file && <Chip label={file.name} size="small" sx={{ ml: 1 }} onDelete={() => setFile(null)} />}
          </Box>

          {importResult && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {importResult.successRows} satır yüklendi (Batch: {importResult.batchId})
            </Alert>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Button onClick={handleFinish} color="inherit">Atla, Sayfaya Git</Button>
            <Button variant="contained" onClick={handleImport}
              disabled={!file || importing || !!importResult}>
              {importing ? <CircularProgress size={20} /> : 'Yükle'}
            </Button>
          </Stack>
          {importResult && (
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Button variant="contained" onClick={handleFinish}>Sayfaya Git</Button>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
