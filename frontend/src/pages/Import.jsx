import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Alert, LinearProgress,
  TextField, InputAdornment, Stack, Tabs, Tab, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Checkbox, FormControlLabel, Divider,
} from '@mui/material';
import {
  CloudUpload, History, Search, CheckCircle, Error as ErrorIcon,
  TableChart, FileDownload, Edit as EditIcon, Map as MapIcon,
  Tune, Add, Delete,
} from '@mui/icons-material';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { toast } from 'react-toastify';
import importService from '../services/importService';
import gisService from '../services/gisService';
import { useAuth } from '../hooks/useAuth';
import PaginationBar from '../components/PaginationBar';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

const fmt = (d) => d ? new Date(d).toLocaleString('tr-TR') : '-';
const fmtCurrency = (val) =>
  val != null
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val)
    : '-';

const EMPTY_PARCEL_FORM = {
  ada: '', parsel: '', mahalle: '', mevkii: '', alan: '', nitelik: '', malikAdi: '', paftaNo: '', rayicBedel: '', yolGenisligi: '',
};

const GIS_LOCAL_FIELDS = {
  Ada:           ['ada_no','ada','adano','ada_numarasi'],
  Parsel:        ['parsel_no','parsel','parselno','parsel_numarasi'],
  Mahalle:       ['mahalle_adi','mahalle','mahalle_ad','mahalle_name'],
  Mevkii:        ['mevki','mevkii','mevki_adi'],
  Alan:          ['alan','yuzolcum','yuzolcumu','alan_m2','parsel_alan'],
  Nitelik:       ['nitelik','nitelik_adi','arazi_nitelik'],
  MalikAdi:      ['malik_adi','malikadi','sahip','owner','tapu_sahibi'],
  PaftaNo:       ['pafta_no','paftano','pafta','pafta_numarasi'],
  EskiAda:       ['eski_ada','eskiada','eski_ada_no'],
  EskiParsel:    ['eski_parsel','eskiparsel','eski_parsel_no'],
  YolGenisligi:  ['yol_genisligi','yolgenisligi','yol_genislik','yol_en'],
  PlanFonksiyonu:['plan_fonksiyonu','planfonksiyonu','imar_durumu','imar_fonksiyon'],
};
const GIS_REQUIRED = ['Ada','Parsel','Mahalle'];
const GIS_GEOM_COLS = ['geom','geometry','shape','the_geom','wkb_geometry','geom_4326'];

const buildAutoMapping = (cols) => {
  const autoMap = {};
  cols.forEach(col => {
    let matched = '';
    for (const [field, aliases] of Object.entries(GIS_LOCAL_FIELDS)) {
      if (aliases.some(a => a.toLowerCase() === col.toLowerCase())) { matched = field; break; }
    }
    autoMap[col] = matched;
  });
  return autoMap;
};

const filterGisCols = (columns) =>
  (columns || []).filter(c => !GIS_GEOM_COLS.includes(c.toLowerCase())).slice(0, 20);

const ALL_PARCEL_COLS = ['Alan','RayicBedel','Mevkii','Nitelik','MalikAdi','PaftaNo','YolGenisligi','EskiAda','EskiParsel','PlanFonksiyonu'];

export default function Import() {
  const { isManager, isAdmin } = useAuth();
  // Staff kullanıcılar doğrudan Parsel Listesi'nden başlar
  const [tab, setTab] = useState(isManager ? 0 : 2);

  // Upload state
  const [uploadMode, setUploadMode] = useState('excel'); // 'excel' | 'shp' | 'merge'
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const fileInputRef = useRef();
  const shpInputRef = useRef();
  const mergeInputRef = useRef();

  // Merge mode state
  const [mergeColumns, setMergeColumns] = useState(['RayicBedel']);
  const [mergeResult, setMergeResult] = useState(null);

  // Custom fields state
  const [customFields, setCustomFields] = useState([]);
  const [cfDialog, setCfDialog] = useState(false);
  const [cfForm, setCfForm] = useState({ fieldKey: '', displayName: '', fieldType: 'text' });
  const [cfEditId, setCfEditId] = useState(null);
  const [cfSaving, setCfSaving] = useState(false);

  // Log state
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Parcel state
  const [parcels, setParcels] = useState([]);
  const [parcelTotal, setParcelTotal] = useState(0);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [mahalleFilter, setMahalleFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [parcelPage, setParcelPage] = useState(1);
  const [parcelPageSize, setParcelPageSize] = useState(20);

  // Parcel edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editParcelId, setEditParcelId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_PARCEL_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // GIS CBS state
  const [gisTables, setGisTables] = useState([]);
  const [gisLoading, setGisLoading] = useState(false);
  const [gisConnected, setGisConnected] = useState(null); // null | true | false
  const [gisSelectedSchema, setGisSelectedSchema] = useState('public');
  const [gisSelectedTable, setGisSelectedTable] = useState('');
  const [gisPreview, setGisPreview] = useState([]);
  const [gisPreviewCols, setGisPreviewCols] = useState([]);
  const [gisPreviewTotal, setGisPreviewTotal] = useState(0);
  const [gisPreviewPage, setGisPreviewPage] = useState(1);
  const [gisPreviewLoading, setGisPreviewLoading] = useState(false);
  const [gisMahalleFilter, setGisMahalleFilter] = useState('');
  const [gisAdaFilter, setGisAdaFilter] = useState('');
  const [gisImporting, setGisImporting] = useState(false);
  const [gisImportResult, setGisImportResult] = useState(null);
  const [gisMapping, setGisMapping] = useState({}); // { gis_kolon: "ParcelAlan" | "" }

  const fetchParcels = useCallback(async () => {
    setLoadingParcels(true);
    try {
      const result = await importService.getParcelsPaged({
        mahalle: mahalleFilter || undefined,
        batchId: batchFilter || undefined,
        page: parcelPage,
        pageSize: parcelPageSize,
      });
      setParcels(result.items);
      setParcelTotal(result.total);
    } catch { toast.error('Parseller yüklenemedi.'); }
    finally { setLoadingParcels(false); }
  }, [mahalleFilter, batchFilter, parcelPage, parcelPageSize]);

  useEffect(() => {
    if (tab === 1) fetchLogs();
  }, [tab]);

  useEffect(() => {
    if (tab === 2) fetchParcels();
  }, [tab, fetchParcels]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try { setLogs(await importService.getLogs()); }
    catch { toast.error('Geçmiş yüklenemedi.'); }
    finally { setLoadingLogs(false); }
  };

  const fetchCustomFields = useCallback(async () => {
    try { setCustomFields(await importService.getCustomFields()); }
    catch { /* sessiz */ }
  }, []);

  useEffect(() => { fetchCustomFields(); }, [fetchCustomFields]);

  useEffect(() => {
    if (tab === 4) fetchCustomFields();
  }, [tab, fetchCustomFields]);

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

  const handleShpChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.match(/\.zip$/i)) {
      toast.warning('SHP yükleme için .zip formatında arşiv gereklidir.');
      return;
    }
    setFile(f);
    setLastResult(null);
  };

  const handleUpload = async () => {
    if (!file) { toast.warning('Önce dosya seçin.'); return; }
    setUploading(true);
    try {
      if (uploadMode === 'merge') {
        if (mergeColumns.length === 0) { toast.warning('Güncellenecek en az bir sütun seçin.'); setUploading(false); return; }
        const result = await importService.mergeParcels(file, mergeColumns);
        setMergeResult(result);
        toast.success(`${result.inserted} eklendi, ${result.updated} güncellendi, ${result.skipped} atlandı.`);
      } else {
        const result = uploadMode === 'shp'
          ? await importService.importShp(file)
          : await importService.importParcels(file);
        setLastResult(result);
        if (result.errorRows === 0) {
          toast.success(`${result.successRows} parsel başarıyla içe aktarıldı.`);
        } else {
          toast.warning(`${result.successRows} başarılı, ${result.errorRows} hatalı satır.`);
        }
      }
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (shpInputRef.current) shpInputRef.current.value = '';
      if (mergeInputRef.current) mergeInputRef.current.value = '';
    } catch (e) {
      toast.error(e.response?.data || 'Yükleme başarısız.');
    } finally { setUploading(false); }
  };

  const handleParcelSearch = () => { setParcelPage(1); };

  const downloadTemplate = async () => {
    try {
      const res = await importService.getTemplate();
      const url = URL.createObjectURL(res);
      const a = document.createElement('a');
      a.href = url; a.download = 'parsel_sablonu.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Şablon indirilemedi.');
    }
  };

  // ── Parsel düzenleme ──────────────────────────────────────────────
  const openEditParcel = (p) => {
    setEditParcelId(p.id);
    const extra = p.extraData ? (() => { try { return JSON.parse(p.extraData); } catch { return {}; } })() : {};
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
      _extra: extra,
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
      const extraData = Object.keys(editForm._extra || {}).length > 0
        ? JSON.stringify(editForm._extra)
        : null;
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
        extraData,
      });
      toast.success('Parsel güncellendi.');
      setEditDialog(false);
      fetchParcels();
    } catch (e) {
      setEditError(e.response?.data?.message || 'Güncelleme başarısız.');
    } finally {
      setEditSaving(false);
    }
  };

  // GIS tab açıldığında bağlan ve tabloları çek
  useEffect(() => {
    if (tab !== 3) return;
    if (gisTables.length > 0) return; // Zaten yüklendi
    loadGisTables();
  }, [tab]);

  const loadGisTables = async () => {
    setGisLoading(true);
    setGisConnected(null);
    try {
      const ok = await gisService.testConnection();
      setGisConnected(ok);
      if (ok) {
        const tables = await gisService.getTables();
        setGisTables(tables);
        // Parsel adındaki tabloyu otomatik seç
        const auto = tables.find(t => /parsel/i.test(t.tableName));
        if (auto) {
          setGisSelectedSchema(auto.schemaName);
          setGisSelectedTable(auto.tableName);
          const cols = filterGisCols(auto.columns);
          setGisPreviewCols(cols);
          setGisMapping(buildAutoMapping(cols));
        }
      }
    } catch { setGisConnected(false); toast.error('GIS bağlantısı kurulamadı.'); }
    finally { setGisLoading(false); }
  };

  const loadGisPreview = async (page = 1) => {
    if (!gisSelectedTable) return;
    setGisPreviewLoading(true);
    setGisPreviewPage(page);
    try {
      const result = await gisService.preview({
        schema: gisSelectedSchema,
        table: gisSelectedTable,
        mahalle: gisMahalleFilter || undefined,
        ada: gisAdaFilter || undefined,
        page,
        pageSize: 50,
      });
      setGisPreview(result.items || []);
      setGisPreviewTotal(result.total || 0);
      const cols = filterGisCols(result.items?.[0] ? Object.keys(result.items[0]) : []);
      setGisPreviewCols(cols);
      // Önizleme yenilenince mevcut mapping'i koru, sadece yeni sütunlar için tahmin ekle
      setGisMapping(prev => {
        const base = buildAutoMapping(cols);
        // Kullanıcının önceden değiştirdiği satırları koru
        return { ...base, ...Object.fromEntries(Object.entries(prev).filter(([k]) => cols.includes(k))) };
      });
    } catch (e) { toast.error(e.response?.data?.message || 'Önizleme yüklenemedi.'); }
    finally { setGisPreviewLoading(false); }
  };

  const handleGisImport = async () => {
    if (!gisSelectedTable) { toast.warning('Önce bir tablo seçin.'); return; }

    // Zorunlu alan kontrolü
    const mappedFields = Object.values(gisMapping);
    const missingRequired = GIS_REQUIRED.filter(f => !mappedFields.includes(f));
    if (missingRequired.length > 0) {
      toast.warning(`Şu alanlar eşleştirilmemiş: ${missingRequired.join(', ')} — eşleştirme tablosunu kontrol edin.`);
      return;
    }

    if (!window.confirm(`"${gisSelectedTable}" tablosundan parsel aktarılacak. Devam edilsin mi?`)) return;
    setGisImporting(true);
    setGisImportResult(null);
    try {
      const result = await gisService.importWithMapping({
        schema: gisSelectedSchema,
        table: gisSelectedTable,
        mahalle: gisMahalleFilter || undefined,
        ada: gisAdaFilter || undefined,
        batchPrefix: 'GIS',
        columnMapping: gisMapping,
      });
      setGisImportResult(result);
      toast.success(`${result.imported} parsel aktarıldı. Batch: ${result.batchId}`);
      // Parsel listesine geç ve sadece bu batch'i göster
      setBatchFilter(result.batchId);
      setTab(2);
    } catch (e) { toast.error(e.response?.data?.message || 'Aktarma başarısız.'); }
    finally { setGisImporting(false); }
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
        {isManager && <Tab value={3} label="CBS'ten Aktar" icon={<MapIcon />} iconPosition="start" />}
        {isAdmin && <Tab value={4} label="Özel Alanlar" icon={<Tune />} iconPosition="start" />}
      </Tabs>

      {/* ─── TAB 0: YÜKLE ─── */}
      {tab === 0 && (
        <Stack spacing={3}>
          {/* Format seçimi */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>Mod:</Typography>
            <ToggleButtonGroup
              value={uploadMode}
              exclusive
              onChange={(_, v) => { if (v) { setUploadMode(v); setFile(null); setLastResult(null); setMergeResult(null); } }}
              size="small"
            >
              <ToggleButton value="excel"><FileDownload sx={{ mr: 0.5, fontSize: 18 }} />Yeni Ekle (Excel)</ToggleButton>
              <ToggleButton value="shp"><MapIcon sx={{ mr: 0.5, fontSize: 18 }} />Yeni Ekle (SHP)</ToggleButton>
              <ToggleButton value="merge"><Tune sx={{ mr: 0.5, fontSize: 18 }} />Mevcut Güncelle</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Merge: sütun seçimi */}
          {uploadMode === 'merge' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Güncellenecek sütunları seçin (Ada+Parsel+Mahalle eşleştirme anahtarı)</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
                {[...ALL_PARCEL_COLS, ...customFields.map(f => f.fieldKey)].map(col => (
                  <FormControlLabel
                    key={col}
                    control={
                      <Checkbox
                        size="small"
                        checked={mergeColumns.includes(col)}
                        onChange={e => setMergeColumns(prev =>
                          e.target.checked ? [...prev, col] : prev.filter(c => c !== col)
                        )}
                      />
                    }
                    label={<Typography variant="body2">{col}</Typography>}
                    sx={{ mr: 2 }}
                  />
                ))}
              </Box>
            </Paper>
          )}

          <Paper elevation={0} sx={{ p: 4, border: '2px dashed', borderColor: file ? 'primary.main' : 'divider', borderRadius: 3, textAlign: 'center' }}>
            <CloudUpload sx={{ fontSize: 56, color: file ? 'primary.main' : 'text.disabled', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              {file ? file.name : (uploadMode === 'shp' ? 'SHP Arşivi Seçin (.zip)' : 'Excel Dosyası Seçin')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {file
                ? `${(file.size / 1024).toFixed(1)} KB`
                : uploadMode === 'shp'
                  ? '.zip — .shp, .dbf, .shx içermeli — maksimum 50 MB'
                  : '.xlsx veya .xls — maksimum 10 MB'}
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="outlined"
                onClick={() => {
                  if (uploadMode === 'shp') shpInputRef.current?.click();
                  else if (uploadMode === 'merge') mergeInputRef.current?.click();
                  else fileInputRef.current?.click();
                }}
                disabled={uploading}>
                Dosya Seç
              </Button>
              <Button variant="contained" onClick={handleUpload} disabled={!file || uploading} startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />}>
                {uploading ? 'Yükleniyor...' : uploadMode === 'merge' ? 'Güncelle' : 'İçe Aktar'}
              </Button>
              {uploadMode !== 'shp' && (
                <Tooltip title="Excel şablonu indir">
                  <Button variant="text" startIcon={<FileDownload />} onClick={downloadTemplate}>
                    Şablon
                  </Button>
                </Tooltip>
              )}
            </Stack>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
            <input ref={shpInputRef} type="file" accept=".zip" hidden onChange={handleShpChange} />
            <input ref={mergeInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
            {uploading && <LinearProgress sx={{ mt: 2 }} />}
          </Paper>

          {uploadMode === 'merge' ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <strong>Birleştirme modu:</strong> Ada+Parsel+Mahalle eşleşen satırları günceller, eşleşmeyenleri ekler.<br />
              Sadece yukarıda seçili sütunlar güncellenir.
            </Alert>
          ) : uploadMode === 'excel' ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <strong>Excel sütun başlıkları (zorunlu: Ada, Parsel, Mahalle):</strong><br />
              Ada | Parsel | Mahalle | Mevkii | Alan | Nitelik | MalikAdi | PaftaNo | RayicBedel | YolGenisligi | <strong>EskiAda</strong> | <strong>EskiParsel</strong>
              {customFields.length > 0 && <><br /><strong>Özel alanlar:</strong> {customFields.map(f => f.fieldKey).join(' | ')}</>}
            </Alert>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <strong>SHP ZIP içeriği:</strong> .shp, .dbf, .shx dosyaları zorunlu.<br />
              DBF sütun adları: Ada, Parsel, Mahalle, Mevkii, Alan, Nitelik, MalikAdi, PaftaNo, RayicBedel, YolGenisligi, EskiAda, EskiParsel<br />
              <Typography variant="caption" color="text.secondary">Geometri otomatik olarak WKT formatında kaydedilir.</Typography>
            </Alert>
          )}

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

          {mergeResult && (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'success.main', borderRadius: 2 }}>
              <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                <Chip icon={<Add />} label={`${mergeResult.inserted} yeni`} color="primary" />
                <Chip icon={<CheckCircle />} label={`${mergeResult.updated} güncellendi`} color="success" />
                <Chip label={`${mergeResult.skipped} atlandı`} color="default" />
                <Chip label={`Batch: ${mergeResult.batchId}`} size="small" variant="outlined" />
              </Stack>
              {mergeResult.errors?.length > 0 && (
                <Box sx={{ maxHeight: 120, overflowY: 'auto' }}>
                  {mergeResult.errors.map((e, i) => (
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
            <Button variant="text" onClick={() => { setMahalleFilter(''); setBatchFilter(''); setParcelPage(1); }}>Temizle</Button>
          </Stack>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  {['Ada', 'Parsel', 'Mahalle', 'Mevkii', 'Alan (m²)', 'Nitelik', 'Malik Adı', 'Pafta No', 'Rayiç Bedel', 'Yol Gen.', 'Batch'].map(h => (
                    <TableCell key={h}><strong>{h}</strong></TableCell>
                  ))}
                  {customFields.filter(f => f.isActive).map(f => (
                    <TableCell key={f.fieldKey} sx={{ color: 'secondary.main' }}><strong>{f.displayName}</strong></TableCell>
                  ))}
                  {isManager && <TableCell align="center"><strong>İşlem</strong></TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingParcels ? (
                  <TableRow><TableCell colSpan={isManager ? 12 + customFields.length : 11 + customFields.length} align="center"><LinearProgress /></TableCell></TableRow>
                ) : parcels.length === 0 ? (
                  <TableRow><TableCell colSpan={isManager ? 12 + customFields.length : 11 + customFields.length} align="center" sx={{ color: 'text.secondary', py: 4 }}>Parsel bulunamadı</TableCell></TableRow>
                ) : parcels.map(p => {
                  const extra = p.extraData ? (() => { try { return JSON.parse(p.extraData); } catch { return {}; } })() : {};
                  return (
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
                    {customFields.filter(f => f.isActive).map(f => (
                      <TableCell key={f.fieldKey} sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                        {extra[f.fieldKey] ?? '—'}
                      </TableCell>
                    ))}
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
                  );
                })}
              </TableBody>
            </Table>
            <PaginationBar total={parcelTotal} page={parcelPage} pageSize={parcelPageSize} onPageChange={setParcelPage} onPageSizeChange={(s) => { setParcelPageSize(s); setParcelPage(1); }} />
          </TableContainer>
        </Stack>
      )}

      {/* ─── TAB 3: CBS'ten Aktar ─── */}
      {tab === 3 && isManager && (
        <Stack spacing={2}>
          {/* Bağlantı durumu */}
          {gisLoading && <Alert severity="info" icon={<CircularProgress size={16} />}>GIS sunucusuna bağlanılıyor (192.168.0.224)...</Alert>}
          {!gisLoading && gisConnected === false && (
            <Alert severity="error" action={<Button size="small" onClick={loadGisTables}>Tekrar Dene</Button>}>
              GIS veritabanına bağlanılamadı (cayirovagis @ 192.168.0.224:5432).
            </Alert>
          )}
          {!gisLoading && gisConnected === true && (
            <Alert severity="success">GIS veritabanına bağlantı başarılı. {gisTables.length} tablo bulundu.</Alert>
          )}

          {gisConnected === true && (
            <>
              {/* Tablo seçimi */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
                  <FormControl size="small" sx={{ minWidth: 300 }}>
                    <InputLabel>GIS Tablosu</InputLabel>
                    <Select
                      label="GIS Tablosu"
                      value={gisSelectedTable}
                      onChange={e => {
                        const tableName = e.target.value;
                        const tableInfo = gisTables.find(t => t.tableName === tableName);
                        setGisSelectedTable(tableName);
                        setGisSelectedSchema(tableInfo?.schemaName || 'public');
                        setGisPreview([]);
                        setGisImportResult(null);
                        const cols = filterGisCols(tableInfo?.columns);
                        setGisPreviewCols(cols);
                        setGisMapping(buildAutoMapping(cols));
                      }}
                    >
                      {gisTables.map(t => (
                        <MenuItem key={`${t.schemaName}.${t.tableName}`} value={t.tableName}>
                          {t.schemaName !== 'public' ? `${t.schemaName}.` : ''}{t.tableName}
                          {t.rowCount > 0 && <Chip label={`~${t.rowCount.toLocaleString('tr-TR')}`} size="small" sx={{ ml: 1 }} />}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField size="small" label="Mahalle Filtresi" value={gisMahalleFilter}
                    onChange={e => setGisMahalleFilter(e.target.value)} sx={{ width: 160 }} />
                  <TextField size="small" label="Ada Filtresi" value={gisAdaFilter}
                    onChange={e => setGisAdaFilter(e.target.value)} sx={{ width: 120 }} />
                  <Button variant="outlined" onClick={() => loadGisPreview(1)} disabled={!gisSelectedTable || gisPreviewLoading}>
                    Önizle
                  </Button>
                  <Button
                    variant="contained" color="success"
                    onClick={handleGisImport}
                    disabled={!gisSelectedTable || gisImporting}
                    startIcon={gisImporting ? <CircularProgress size={16} color="inherit" /> : <MapIcon />}
                  >
                    {gisImporting ? 'Aktarılıyor...' : 'Yerel DB\'ye Aktar'}
                  </Button>
                </Stack>
              </Paper>

              {gisImportResult && (
                <Alert severity="success">
                  <strong>{gisImportResult.imported}</strong> parsel aktarıldı,{' '}
                  <strong>{gisImportResult.skipped}</strong> atlandı.{' '}
                  Batch ID: <code>{gisImportResult.batchId}</code>
                </Alert>
              )}

              {/* Sütun Eşleştirme Tablosu */}
              {gisPreviewCols.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Typography variant="subtitle2">Sütun Eşleştirme</Typography>
                    <Chip label="Ada, Parsel, Mahalle zorunlu *" size="small" color="warning" />
                    <Typography variant="caption" color="text.secondary">
                      — GIS sütununu hangi yerel alana aktaracağınızı seçin. İstemediğinizi "Yok" bırakın.
                    </Typography>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'background.default' }}>
                        <TableCell><strong>GIS Sütunu</strong></TableCell>
                        <TableCell><strong>Yerel Alan</strong></TableCell>
                        <TableCell><strong>Örnek Değer</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gisPreviewCols.map(col => {
                        const isRequired = GIS_REQUIRED.includes(gisMapping[col]);
                        const sampleVal = gisPreview[0]?.[col];
                        return (
                          <TableRow key={col} sx={{ bgcolor: isRequired ? 'success.50' : undefined }}>
                            <TableCell><code>{col}</code></TableCell>
                            <TableCell>
                              <Select
                                size="small"
                                value={gisMapping[col] ?? ''}
                                onChange={e => setGisMapping(m => ({ ...m, [col]: e.target.value }))}
                                sx={{ minWidth: 180 }}
                              >
                                <MenuItem value=""><em>— Yok (atla) —</em></MenuItem>
                                {Object.keys(GIS_LOCAL_FIELDS).map(f => (
                                  <MenuItem key={f} value={f}>
                                    {f}{GIS_REQUIRED.includes(f) ? ' *' : ''}
                                  </MenuItem>
                                ))}
                              </Select>
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                              {sampleVal != null ? String(sampleVal) : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Paper>
              )}

              {/* Önizleme tablosu */}
              {gisPreview.length > 0 && (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'background.default' }}>
                        {gisPreviewCols.map(c => <TableCell key={c}><strong>{c}</strong></TableCell>)}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gisPreviewLoading
                        ? <TableRow><TableCell colSpan={gisPreviewCols.length} align="center"><LinearProgress /></TableCell></TableRow>
                        : gisPreview.map((row, i) => (
                          <TableRow key={i} hover>
                            {gisPreviewCols.map(c => (
                              <TableCell key={c} sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {row[c] != null ? String(row[c]) : '—'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      }
                    </TableBody>
                  </Table>
                  <PaginationBar
                    total={gisPreviewTotal}
                    page={gisPreviewPage}
                    pageSize={50}
                    onPageChange={(p) => loadGisPreview(p)}
                    onPageSizeChange={() => {}}
                  />
                </TableContainer>
              )}
            </>
          )}
        </Stack>
      )}

      {/* ─── TAB 4: ÖZEL ALANLAR (Admin) ─── */}
      {tab === 4 && isAdmin && (
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" fontWeight={600}>Özel Parsel Alanları</Typography>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => { setCfForm({ fieldKey: '', displayName: '', fieldType: 'text' }); setCfEditId(null); setCfDialog(true); }}>
              Yeni Alan
            </Button>
          </Box>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell><strong>Alan Anahtarı</strong></TableCell>
                  <TableCell><strong>Görünen Ad</strong></TableCell>
                  <TableCell><strong>Tip</strong></TableCell>
                  <TableCell><strong>Sıra</strong></TableCell>
                  <TableCell><strong>Aktif</strong></TableCell>
                  <TableCell align="center"><strong>İşlem</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customFields.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>Henüz özel alan eklenmemiş</TableCell></TableRow>
                ) : customFields.map(f => (
                  <TableRow key={f.id} hover>
                    <TableCell><code>{f.fieldKey}</code></TableCell>
                    <TableCell>{f.displayName}</TableCell>
                    <TableCell><Chip label={f.fieldType} size="small" /></TableCell>
                    <TableCell>{f.sortOrder}</TableCell>
                    <TableCell>
                      <Chip label={f.isActive ? 'Aktif' : 'Pasif'} size="small" color={f.isActive ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Düzenle">
                        <IconButton size="small" color="primary" onClick={() => {
                          setCfForm({ fieldKey: f.fieldKey, displayName: f.displayName, fieldType: f.fieldType });
                          setCfEditId(f.id); setCfDialog(true);
                        }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton size="small" color="error" onClick={async () => {
                          if (!window.confirm(`"${f.displayName}" alanını silmek istediğinize emin misiniz?`)) return;
                          try {
                            await importService.deleteCustomField(f.id);
                            toast.success('Alan silindi.');
                            fetchCustomFields();
                          } catch { toast.error('Silinemedi.'); }
                        }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Alert severity="info">
            Eklediğiniz alanlar Excel şablonuna otomatik eklenir (mor renk). Import sırasında bu sütunlar da okunur ve her parselin ExtraData alanına kaydedilir.
          </Alert>
        </Stack>
      )}

      {/* ── Özel Alan Ekleme/Düzenleme Dialog ── */}
      <Dialog open={cfDialog} onClose={() => setCfDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{cfEditId ? 'Alanı Düzenle' : 'Yeni Özel Alan'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {!cfEditId && (
              <TextField
                label="Alan Anahtarı (FieldKey)" required fullWidth size="small"
                helperText="Sadece harf, rakam, alt çizgi — örn: BagYola, Irtifa"
                value={cfForm.fieldKey}
                onChange={e => setCfForm(p => ({ ...p, fieldKey: e.target.value }))}
              />
            )}
            <TextField
              label="Görünen Ad" required fullWidth size="small"
              value={cfForm.displayName}
              onChange={e => setCfForm(p => ({ ...p, displayName: e.target.value }))}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Tip</InputLabel>
              <Select label="Tip" value={cfForm.fieldType} onChange={e => setCfForm(p => ({ ...p, fieldType: e.target.value }))}>
                <MenuItem value="text">Metin</MenuItem>
                <MenuItem value="number">Sayı</MenuItem>
                <MenuItem value="date">Tarih</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCfDialog(false)}>İptal</Button>
          <Button variant="contained" disabled={cfSaving} onClick={async () => {
            if (!cfForm.displayName.trim()) { toast.warning('Görünen ad zorunludur.'); return; }
            if (!cfEditId && !cfForm.fieldKey.trim()) { toast.warning('Alan anahtarı zorunludur.'); return; }
            setCfSaving(true);
            try {
              if (cfEditId) {
                await importService.updateCustomField(cfEditId, { displayName: cfForm.displayName, fieldType: cfForm.fieldType });
              } else {
                await importService.createCustomField({ fieldKey: cfForm.fieldKey, displayName: cfForm.displayName, fieldType: cfForm.fieldType });
              }
              toast.success('Kaydedildi.');
              setCfDialog(false);
              fetchCustomFields();
            } catch (e) {
              toast.error(e.response?.data || 'Kaydedilemedi.');
            } finally { setCfSaving(false); }
          }}>
            {cfSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

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
            {customFields.filter(f => f.isActive).length > 0 && (
              <>
                <Divider><Typography variant="caption" color="text.secondary">Özel Alanlar</Typography></Divider>
                {customFields.filter(f => f.isActive).map(f => (
                  <TextField
                    key={f.fieldKey}
                    label={f.displayName}
                    fullWidth
                    size="small"
                    type={f.fieldType === 'number' ? 'number' : f.fieldType === 'date' ? 'date' : 'text'}
                    value={editForm._extra?.[f.fieldKey] || ''}
                    onChange={e => setEditForm(p => ({
                      ...p,
                      _extra: { ...(p._extra || {}), [f.fieldKey]: e.target.value }
                    }))}
                  />
                ))}
              </>
            )}
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
