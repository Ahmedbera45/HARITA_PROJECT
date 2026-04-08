import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  DialogContentText, Tooltip, Stack, Chip, Divider, Grid,
  InputAdornment, List, ListItem, ListItemIcon, ListItemText,
  ListItemSecondaryAction, Breadcrumbs, Link, CircularProgress,
  FormControl, InputLabel, Select,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, AttachFile, Download, Folder,
  InsertDriveFile, ArrowBack, Warning, Map as MapIcon,
  Visibility, NavigateNext, UploadFile,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import imarPlanService from '../services/imarPlanService';
import { useAuth } from '../hooks/useAuth';
import PaginationBar from '../components/PaginationBar';

const PLAN_TURLERI = [
  'Uygulama İmar Planı (UİP)',
  'Nazım İmar Planı (NİP)',
  'Plan Tadilatı',
  'Plan Revizyonu',
  'Parselasyon Planı',
  'İmar Planı İptali',
  'Diğer',
];

const DURUMLAR = ['Yürürlükte', 'Askıda (İtiraz)', 'Revize Edildi', 'İptal Edildi', 'Hazırlanıyor'];

const ONAY_MAKAMLARI = [
  'Belediye Meclisi',
  'Büyükşehir Belediye Meclisi',
  'Çevre ve Şehircilik Bakanlığı',
  'Cumhurbaşkanlığı',
  'Diğer',
];

const DOSYA_TURLERI = ['Plan Paftası', 'Plan Raporu', 'Onay Yazısı', 'Meclis Kararı', 'İtiraz Belgesi', 'Diğer'];

const DURUM_COLORS = {
  'Yürürlükte':     'success',
  'Askıda (İtiraz)':'warning',
  'Revize Edildi':  'info',
  'İptal Edildi':   'error',
  'Hazırlanıyor':   'default',
};

const EMPTY_FORM = {
  planNo: '', planAdi: '', planTuru: '', mahalle: '', ada: '', parsel: '',
  yuzolcumHa: '', konu: '', onayTarihi: '', onayMakami: '', durum: 'Yürürlükte', aciklama: '',
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '—';
const fmtSize = (b) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const getErrMsg = (e) => {
  const d = e?.response?.data;
  if (!d) return 'İşlem başarısız.';
  if (typeof d === 'string') return d;
  if (d.title) return d.title;
  return 'İşlem başarısız.';
};

// ─── Network File Browser Dialog ───────────────────────────────────────────
function NetworkBrowser({ open, onClose, onSelect }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState([]);

  const navigate = async (path = '') => {
    setLoading(true);
    try {
      const data = await imarPlanService.browse(path);
      setResult(data);
      setSelected([]);
    } catch (e) {
      toast.error(getErrMsg(e) || 'Klasör açılamadı.');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open) navigate(''); }, [open]);

  const toggleFile = (file) => {
    setSelected(prev =>
      prev.some(f => f.fullPath === file.fullPath)
        ? prev.filter(f => f.fullPath !== file.fullPath)
        : [...prev, file]
    );
  };

  const breadcrumbs = result
    ? ['Kök', ...result.currentPath.split('\\').filter(Boolean)]
    : ['Kök'];

  const handleBreadcrumb = (idx) => {
    if (!result) return;
    if (idx === 0) { navigate(''); return; }
    const parts = result.currentPath.split('\\').filter(Boolean);
    navigate(parts.slice(0, idx).join('\\'));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Folder color="primary" /> Arşiv Klasörü — Dosya Seç
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {/* Breadcrumb */}
        <Box sx={{ px: 2, py: 1, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            {breadcrumbs.map((crumb, idx) => (
              idx === breadcrumbs.length - 1
                ? <Typography key={idx} variant="body2" fontWeight={600}>{crumb}</Typography>
                : <Link key={idx} component="button" variant="body2" underline="hover"
                    onClick={() => handleBreadcrumb(idx)}>{crumb}</Link>
            ))}
          </Breadcrumbs>
        </Box>

        <Box sx={{ minHeight: 320, position: 'relative' }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress size={36} />
            </Box>
          )}
          {!loading && result && (
            <List dense>
              {/* Back button */}
              {result.parentPath !== undefined && result.parentPath !== null && (
                <ListItem button onClick={() => navigate(result.parentPath)}>
                  <ListItemIcon><ArrowBack fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Üst Klasöre Git" primaryTypographyProps={{ color: 'text.secondary' }} />
                </ListItem>
              )}
              {/* Folders */}
              {result.directories.map(dir => (
                <ListItem button key={dir.fullPath} onClick={() => navigate(dir.fullPath)}>
                  <ListItemIcon><Folder color="warning" fontSize="small" /></ListItemIcon>
                  <ListItemText primary={dir.name} />
                  <NavigateNext fontSize="small" color="action" />
                </ListItem>
              ))}
              {/* Files */}
              {result.files.map(file => {
                const isSel = selected.some(f => f.fullPath === file.fullPath);
                return (
                  <ListItem
                    button key={file.fullPath}
                    onClick={() => toggleFile(file)}
                    selected={isSel}
                    sx={{ bgcolor: isSel ? 'action.selected' : undefined }}
                  >
                    <ListItemIcon>
                      <InsertDriveFile color={isSel ? 'primary' : 'action'} fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={fmtSize(file.size)}
                    />
                    {isSel && <Chip label="Seçildi" size="small" color="primary" />}
                  </ListItem>
                );
              })}
              {result.directories.length === 0 && result.files.length === 0 && (
                <ListItem>
                  <ListItemText primary="Bu klasör boş." primaryTypographyProps={{ color: 'text.secondary', textAlign: 'center' }} />
                </ListItem>
              )}
            </List>
          )}
        </Box>

        {selected.length > 0 && (
          <Box sx={{ px: 2, py: 1, bgcolor: 'primary.50', borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="primary.main" fontWeight={600}>
              {selected.length} dosya seçildi: {selected.map(f => f.name).join(', ')}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button
          variant="contained"
          disabled={selected.length === 0}
          onClick={() => { onSelect(selected); onClose(); }}
        >
          {selected.length > 0 ? `${selected.length} Dosyayı Ekle` : 'Dosya Seçin'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Plan Detail / Ek Yönetimi Dialog ──────────────────────────────────────
function PlanDetailDialog({ plan, open, onClose, onEkAdded, onEkDeleted }) {
  const [browserOpen, setBrowserOpen] = useState(false);
  const [ekForm, setEkForm] = useState({ dosyaTuru: 'Plan Paftası', aciklama: '' });
  const [addingEks, setAddingEks] = useState(false);

  if (!plan) return null;

  const handleFilesSelected = async (files) => {
    setAddingEks(true);
    let added = 0;
    for (const f of files) {
      try {
        const ek = await imarPlanService.addEk(plan.id, {
          dosyaAdi: f.name,
          dosyaYolu: f.fullPath,
          dosyaTuru: ekForm.dosyaTuru,
          aciklama: ekForm.aciklama || null,
        });
        onEkAdded(plan.id, ek);
        added++;
      } catch (e) {
        toast.error(`"${f.name}" eklenemedi: ${getErrMsg(e)}`);
      }
    }
    if (added > 0) toast.success(`${added} dosya eklendi.`);
    setAddingEks(false);
  };

  const handleDeleteEk = async (ekId, dosyaAdi) => {
    try {
      await imarPlanService.deleteEk(ekId);
      onEkDeleted(plan.id, ekId);
      toast.success(`"${dosyaAdi}" silindi.`);
    } catch (e) { toast.error(getErrMsg(e)); }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MapIcon color="primary" />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>{plan.planNo} — {plan.planAdi}</Typography>
              <Typography variant="caption" color="text.secondary">{plan.planTuru}</Typography>
            </Box>
          </Box>
          <Chip label={plan.durum} color={DURUM_COLORS[plan.durum] || 'default'} size="small" />
        </DialogTitle>
        <DialogContent dividers>
          {/* Plan Bilgileri */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}><Typography variant="caption" color="text.secondary">Mahalle</Typography><Typography>{plan.mahalle || '—'}</Typography></Grid>
            <Grid item xs={3}><Typography variant="caption" color="text.secondary">Ada</Typography><Typography>{plan.ada || '—'}</Typography></Grid>
            <Grid item xs={3}><Typography variant="caption" color="text.secondary">Parsel</Typography><Typography>{plan.parsel || '—'}</Typography></Grid>
            {plan.yuzolcumHa && <Grid item xs={4}><Typography variant="caption" color="text.secondary">Yüzölçüm (ha)</Typography><Typography>{plan.yuzolcumHa}</Typography></Grid>}
            <Grid item xs={4}><Typography variant="caption" color="text.secondary">Onay Tarihi</Typography><Typography>{fmt(plan.onayTarihi)}</Typography></Grid>
            <Grid item xs={4}><Typography variant="caption" color="text.secondary">Onay Makamı</Typography><Typography>{plan.onayMakami || '—'}</Typography></Grid>
            {plan.konu && <Grid item xs={12}><Typography variant="caption" color="text.secondary">Konu</Typography><Typography>{plan.konu}</Typography></Grid>}
            {plan.aciklama && <Grid item xs={12}><Typography variant="caption" color="text.secondary">Açıklama</Typography><Typography>{plan.aciklama}</Typography></Grid>}
            <Grid item xs={12}><Typography variant="caption" color="text.secondary">Ekleyen / Tarih</Typography><Typography>{plan.createdByName} — {fmt(plan.createdAt)}</Typography></Grid>
          </Grid>

          <Divider sx={{ mb: 2 }} />

          {/* Ek Dosyalar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              <AttachFile fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
              Ek Dosyalar ({plan.ekler?.length || 0})
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                select size="small" label="Dosya Türü"
                value={ekForm.dosyaTuru}
                onChange={e => setEkForm({ ...ekForm, dosyaTuru: e.target.value })}
                sx={{ minWidth: 140 }}
              >
                {DOSYA_TURLERI.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <Button
                variant="outlined" size="small" startIcon={<Folder />}
                onClick={() => setBrowserOpen(true)}
                disabled={addingEks}
              >
                Ağdan Ekle
              </Button>
            </Stack>
          </Box>

          {plan.ekler?.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              Henüz ek dosya yok. "Ağdan Ekle" butonu ile arşiv klasöründen dosya seçin.
            </Typography>
          ) : (
            <List dense>
              {(plan.ekler || []).map(ek => (
                <ListItem key={ek.id} divider
                  sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
                  <ListItemIcon>
                    <InsertDriveFile color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" fontWeight={500}>{ek.dosyaAdi}</Typography>
                        {ek.dosyaTuru && <Chip label={ek.dosyaTuru} size="small" variant="outlined" />}
                      </Stack>
                    }
                    secondary={`${ek.ekleyenAdi || ''} — ${fmt(ek.eklenmeTarihi)}${ek.aciklama ? ' · ' + ek.aciklama : ''}`}
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="İndir / Aç">
                        <IconButton size="small" color="primary"
                          onClick={async () => {
                            try { await imarPlanService.downloadEk(ek.id); }
                            catch { toast.error('Dosya indirilemedi.'); }
                          }}
                        >
                          <Download fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton size="small" color="error"
                          onClick={() => handleDeleteEk(ek.id, ek.dosyaAdi)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Kapat</Button>
        </DialogActions>
      </Dialog>

      <NetworkBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onSelect={handleFilesSelected}
      />
    </>
  );
}

// ─── Ana Sayfa ─────────────────────────────────────────────────────────────
export default function ImarPlanlari() {
  const { isAdmin, isManager } = useAuth();
  const canManage = isAdmin || isManager;

  const [plans, setPlans] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filtreler
  const [search, setSearch] = useState('');
  const [filterTur, setFilterTur] = useState('');
  const [filterDurum, setFilterDurum] = useState('');
  const [filterYil, setFilterYil] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Create / Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Detail dialog
  const [detailPlan, setDetailPlan] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const result = await imarPlanService.getPaged({
        search: search || undefined,
        planTuru: filterTur || undefined,
        durum: filterDurum || undefined,
        yil: filterYil || undefined,
        page,
        pageSize,
      });
      setPlans(result.items);
      setTotal(result.total);
    } catch { toast.error('İmar planları yüklenemedi.'); }
    finally { setLoading(false); }
  }, [search, filterTur, filterDurum, filterYil, page, pageSize]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleFilterChange = (setter) => (val) => { setter(val); setPage(1); };

  // Yıl seçenekleri — sabit aralık (server-side yıllar gelmediğinden)
  const yillar = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 30 }, (_, i) => current - i);
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setIsEdit(false);
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (p) => {
    setForm({
      planNo: p.planNo, planAdi: p.planAdi, planTuru: p.planTuru,
      mahalle: p.mahalle || '', ada: p.ada || '', parsel: p.parsel || '',
      yuzolcumHa: p.yuzolcumHa != null ? String(p.yuzolcumHa) : '',
      konu: p.konu || '',
      onayTarihi: p.onayTarihi ? p.onayTarihi.slice(0, 10) : '',
      onayMakami: p.onayMakami || '', durum: p.durum, aciklama: p.aciklama || '',
    });
    setIsEdit(true);
    setEditId(p.id);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.planNo.trim() || !form.planAdi.trim() || !form.planTuru) {
      toast.warning('Plan No, Plan Adı ve Plan Türü zorunludur.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        planNo: form.planNo.trim(),
        planAdi: form.planAdi.trim(),
        planTuru: form.planTuru,
        mahalle: form.mahalle || null,
        ada: form.ada || null,
        parsel: form.parsel || null,
        yuzolcumHa: form.yuzolcumHa ? parseFloat(form.yuzolcumHa) : null,
        konu: form.konu || null,
        onayTarihi: form.onayTarihi || null,
        onayMakami: form.onayMakami || null,
        durum: form.durum,
        aciklama: form.aciklama || null,
      };
      if (isEdit) {
        await imarPlanService.update(editId, payload);
        toast.success('İmar planı güncellendi.');
      } else {
        await imarPlanService.create(payload);
        toast.success('İmar planı oluşturuldu.');
      }
      setFormOpen(false);
      fetchPlans();
    } catch (e) { toast.error(getErrMsg(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await imarPlanService.delete(deleteId);
      toast.success('İmar planı silindi.');
      fetchPlans();
    } catch (e) { toast.error(getErrMsg(e)); }
    finally { setDeleteOpen(false); setDeleteId(null); }
  };

  const openDetail = (p) => {
    setDetailPlan(p);
    setDetailOpen(true);
  };

  // After adding/deleting an ek, update the local state
  const handleEkAdded = (planId, ek) => {
    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, ekler: [...(p.ekler || []), ek] } : p
    ));
    setDetailPlan(prev => prev ? { ...prev, ekler: [...(prev.ekler || []), ek] } : prev);
  };

  const handleEkDeleted = (planId, ekId) => {
    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, ekler: (p.ekler || []).filter(e => e.id !== ekId) } : p
    ));
    setDetailPlan(prev => prev
      ? { ...prev, ekler: (prev.ekler || []).filter(e => e.id !== ekId) }
      : prev);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MapIcon color="primary" /> İmar Planları Arşivi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Uygulama imar planları, tadilatlar ve revizyonlar
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Yeni Plan
        </Button>
      </Box>

      {/* Filtreler */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            size="small" placeholder="Plan No, Ad, Mahalle, Ada, Parsel..."
            value={search} onChange={e => handleFilterChange(setSearch)(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ minWidth: 260 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Plan Türü</InputLabel>
            <Select value={filterTur} label="Plan Türü" onChange={e => handleFilterChange(setFilterTur)(e.target.value)}>
              <MenuItem value="">Tümü</MenuItem>
              {PLAN_TURLERI.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Durum</InputLabel>
            <Select value={filterDurum} label="Durum" onChange={e => handleFilterChange(setFilterDurum)(e.target.value)}>
              <MenuItem value="">Tümü</MenuItem>
              {DURUMLAR.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Yıl</InputLabel>
            <Select value={filterYil} label="Yıl" onChange={e => handleFilterChange(setFilterYil)(e.target.value)}>
              <MenuItem value="">Tümü</MenuItem>
              {yillar.map(y => <MenuItem key={y} value={String(y)}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          {(search || filterTur || filterDurum || filterYil) && (
            <Button size="small" onClick={() => { setSearch(''); setFilterTur(''); setFilterDurum(''); setFilterYil(''); setPage(1); }}>
              Temizle
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Tablo */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell><strong>Plan No</strong></TableCell>
              <TableCell><strong>Plan Adı</strong></TableCell>
              <TableCell><strong>Plan Türü</strong></TableCell>
              <TableCell><strong>Konum</strong></TableCell>
              <TableCell><strong>Onay Tarihi</strong></TableCell>
              <TableCell><strong>Durum</strong></TableCell>
              <TableCell align="center"><strong>Ekler</strong></TableCell>
              <TableCell align="right"><strong>İşlemler</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <CircularProgress size={24} />
              </TableCell></TableRow>
            ) : plans.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                Kayıt bulunamadı
              </TableCell></TableRow>
            ) : plans.map(p => (
              <TableRow key={p.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={700} color="primary.main">{p.planNo}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>{p.planAdi}</Typography>
                  {p.konu && <Typography variant="caption" color="text.secondary" display="block">{p.konu}</Typography>}
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{p.planTuru}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {[p.mahalle, p.ada && `Ada: ${p.ada}`, p.parsel && `Parsel: ${p.parsel}`].filter(Boolean).join(' / ')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{fmt(p.onayTarihi)}</Typography>
                  {p.onayMakami && <Typography variant="caption" color="text.secondary" display="block">{p.onayMakami}</Typography>}
                </TableCell>
                <TableCell>
                  <Chip label={p.durum} size="small" color={DURUM_COLORS[p.durum] || 'default'} />
                </TableCell>
                <TableCell align="center">
                  {(p.ekler?.length || 0) > 0
                    ? <Chip label={`${p.ekler.length} dosya`} size="small" color="primary" variant="outlined" icon={<AttachFile />} />
                    : <Typography variant="caption" color="text.disabled">—</Typography>
                  }
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                    <Tooltip title="Detay & Ekler">
                      <IconButton size="small" onClick={() => openDetail(p)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Düzenle">
                      <IconButton size="small" color="primary" onClick={() => openEdit(p)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canManage && (
                      <Tooltip title="Sil">
                        <IconButton size="small" color="error" onClick={() => { setDeleteId(p.id); setDeleteOpen(true); }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginationBar total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </TableContainer>

      {/* ─── Oluştur / Düzenle Dialog ─── */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{isEdit ? 'İmar Planını Düzenle' : 'Yeni İmar Planı'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Sol kolon */}
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <TextField label="Plan No *" fullWidth value={form.planNo}
                  onChange={e => setForm({ ...form, planNo: e.target.value })}
                  placeholder="örn. UİP-25/A" />
                <TextField label="Plan Adı *" fullWidth value={form.planAdi}
                  onChange={e => setForm({ ...form, planAdi: e.target.value })} />
                <TextField select label="Plan Türü *" fullWidth value={form.planTuru}
                  onChange={e => setForm({ ...form, planTuru: e.target.value })}>
                  <MenuItem value="">— Seçiniz —</MenuItem>
                  {PLAN_TURLERI.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <TextField select label="Durum" fullWidth value={form.durum}
                  onChange={e => setForm({ ...form, durum: e.target.value })}>
                  {DURUMLAR.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </TextField>
                <TextField label="Onay Tarihi" type="date" fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={form.onayTarihi}
                  onChange={e => setForm({ ...form, onayTarihi: e.target.value })} />
                <TextField select label="Onay Makamı" fullWidth value={form.onayMakami}
                  onChange={e => setForm({ ...form, onayMakami: e.target.value })}>
                  <MenuItem value="">— Seçiniz —</MenuItem>
                  {ONAY_MAKAMLARI.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
              </Stack>
            </Grid>
            {/* Sağ kolon */}
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
                <TextField label="Mahalle" fullWidth value={form.mahalle}
                  onChange={e => setForm({ ...form, mahalle: e.target.value })} />
                <Stack direction="row" spacing={2}>
                  <TextField label="Ada" fullWidth value={form.ada}
                    onChange={e => setForm({ ...form, ada: e.target.value })} />
                  <TextField label="Parsel" fullWidth value={form.parsel}
                    onChange={e => setForm({ ...form, parsel: e.target.value })} />
                </Stack>
                <TextField label="Yüzölçüm (Ha)" type="number" fullWidth value={form.yuzolcumHa}
                  onChange={e => setForm({ ...form, yuzolcumHa: e.target.value })} />
                <TextField label="Konu / Plan Hükümleri Özeti" fullWidth multiline rows={2}
                  value={form.konu}
                  onChange={e => setForm({ ...form, konu: e.target.value })} />
                <TextField label="Açıklama / Notlar" fullWidth multiline rows={3}
                  value={form.aciklama}
                  onChange={e => setForm({ ...form, aciklama: e.target.value })} />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Detay Dialog ─── */}
      <PlanDetailDialog
        plan={detailPlan}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEkAdded={handleEkAdded}
        onEkDeleted={handleEkDeleted}
      />

      {/* ─── Silme Onay Dialog ─── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="error" /> İmar Planını Sil
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bu İmar planını silmek istediğinize emin misiniz? Kayıtlı tüm ek dosya bilgileri de silinecek.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>İptal</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Sil</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
