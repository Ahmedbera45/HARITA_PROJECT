import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  DialogContentText, Tooltip, Stack, Avatar, Switch, FormControlLabel,
  Divider,
} from '@mui/material';
import { Add, Delete, CheckCircle, Cancel, HourglassEmpty, Schedule } from '@mui/icons-material';
import { toast } from 'react-toastify';
import leaveService from '../services/leaveService';
import { useAuth } from '../hooks/useAuth';

const STATUS_CHIP = {
  Bekliyor:   { color: 'warning', icon: <HourglassEmpty fontSize="inherit" /> },
  Onaylandı:  { color: 'success', icon: <CheckCircle fontSize="inherit" /> },
  Reddedildi: { color: 'error',   icon: <Cancel fontSize="inherit" /> },
};

const LEAVE_TYPES = ['Yıllık İzin', 'Hastalık İzni', 'Mazeret İzni', 'Ücretsiz İzin'];

const fmt = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

const EMPTY_FORM = {
  leaveType: 'Yıllık İzin',
  startDate: '',
  endDate: '',
  isSaatlik: false,
  baslangicSaati: '',
  bitisSaati: '',
  description: '',
};

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ decision: 'Onaylandı', reviewNote: '' });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const { isManager } = useAuth();

  useEffect(() => { fetchLeaves(); }, []);

  const fetchLeaves = async () => {
    try {
      setLeaves(await leaveService.getAll());
    } catch { toast.error('İzinler yüklenemedi.'); }
    finally { setLoading(false); }
  };

  const getErrMsg = (e) => {
    const d = e.response?.data;
    if (!d) return 'İşlem başarısız.';
    if (typeof d === 'string') return d;
    if (d.message) return d.message;
    if (d.title) return d.title;
    return 'İşlem başarısız.';
  };

  const handleCreate = async () => {
    if (!form.startDate) { toast.warning('Tarih zorunludur.'); return; }
    if (!form.isSaatlik && !form.endDate) { toast.warning('Bitiş tarihi zorunludur.'); return; }
    if (!form.isSaatlik && new Date(form.endDate) < new Date(form.startDate)) {
      toast.warning('Bitiş tarihi başlangıçtan önce olamaz.'); return;
    }
    if (form.isSaatlik && (!form.baslangicSaati || !form.bitisSaati)) {
      toast.warning('Saatlik izin için başlangıç ve bitiş saati zorunludur.'); return;
    }
    setSaving(true);
    try {
      await leaveService.create({
        leaveType: form.isSaatlik ? 'Saatlik İzin' : form.leaveType,
        startDate: form.startDate,
        endDate: form.isSaatlik ? form.startDate : form.endDate,
        isSaatlik: form.isSaatlik,
        baslangicSaati: form.isSaatlik ? form.baslangicSaati : null,
        bitisSaati: form.isSaatlik ? form.bitisSaati : null,
        description: form.description || null,
      });
      toast.success('İzin talebi oluşturuldu.');
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      fetchLeaves();
    } catch (e) {
      toast.error(getErrMsg(e));
    } finally { setSaving(false); }
  };

  const handleReview = async () => {
    setSaving(true);
    try {
      await leaveService.review(reviewTarget.id, reviewForm);
      toast.success(`Talep ${reviewForm.decision === 'Onaylandı' ? 'onaylandı' : 'reddedildi'}.`);
      setReviewOpen(false);
      fetchLeaves();
    } catch (e) {
      toast.error(getErrMsg(e));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await leaveService.delete(deleteId);
      toast.success('Talep silindi.');
      fetchLeaves();
    } catch (e) { toast.error(getErrMsg(e)); }
    finally { setDeleteOpen(false); setDeleteId(null); }
  };

  const previewDays = !form.isSaatlik && form.startDate && form.endDate
    ? Math.max(0, Math.floor((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1)
    : 0;

  const formatSure = (l) => {
    if (l.isSaatlik) {
      return (
        <Chip
          icon={<Schedule fontSize="inherit" />}
          label={`${l.baslangicSaati || '?'} – ${l.bitisSaati || '?'}`}
          size="small"
          color="info"
          variant="outlined"
        />
      );
    }
    return <Chip label={`${l.daysCount} gün`} size="small" />;
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">İzin Yönetimi</Typography>
          <Typography variant="body2" color="text.secondary">
            Tüm personel izin talepleri
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
          İzin Talebi Oluştur
        </Button>
      </Box>

      {/* Özet Chips */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {['Bekliyor', 'Onaylandı', 'Reddedildi'].map(s => (
          <Chip
            key={s}
            label={`${s}: ${leaves.filter(l => l.status === s).length}`}
            color={STATUS_CHIP[s].color}
            variant="outlined"
            icon={STATUS_CHIP[s].icon}
          />
        ))}
        <Chip
          icon={<Schedule fontSize="inherit" />}
          label={`Saatlik: ${leaves.filter(l => l.isSaatlik).length}`}
          color="info"
          variant="outlined"
        />
      </Stack>

      {/* Tablo */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell><strong>Personel</strong></TableCell>
              <TableCell><strong>İzin Türü</strong></TableCell>
              <TableCell><strong>Tarih</strong></TableCell>
              <TableCell><strong>Süre / Saat</strong></TableCell>
              <TableCell><strong>Durum</strong></TableCell>
              <TableCell><strong>Açıklama</strong></TableCell>
              <TableCell align="right"><strong>İşlem</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center">Yükleniyor...</TableCell></TableRow>
            ) : leaves.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>Kayıt bulunamadı</TableCell></TableRow>
            ) : leaves.map(l => (
              <TableRow key={l.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', bgcolor: 'primary.light' }}>
                      {(l.userFullName || '?')[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{l.userFullName}</Typography>
                      <Typography variant="caption" color="text.secondary">{l.userDepartment}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={l.leaveType}
                    size="small"
                    color={l.isSaatlik ? 'info' : 'default'}
                    variant={l.isSaatlik ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{fmt(l.startDate)}</Typography>
                  {!l.isSaatlik && l.startDate !== l.endDate && (
                    <Typography variant="caption" color="text.secondary">– {fmt(l.endDate)}</Typography>
                  )}
                </TableCell>
                <TableCell>{formatSure(l)}</TableCell>
                <TableCell>
                  <Tooltip title={l.reviewNote || ''}>
                    <Chip
                      label={l.status}
                      size="small"
                      color={STATUS_CHIP[l.status]?.color || 'default'}
                      icon={STATUS_CHIP[l.status]?.icon}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ maxWidth: 160 }}>
                  <Typography variant="caption" noWrap>{l.description || '-'}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                    {isManager && l.status === 'Bekliyor' && (
                      <Button
                        size="small" variant="outlined" color="primary"
                        onClick={() => { setReviewTarget(l); setReviewForm({ decision: 'Onaylandı', reviewNote: '' }); setReviewOpen(true); }}
                      >
                        İncele
                      </Button>
                    )}
                    {(isManager || l.status === 'Bekliyor') && (
                      <IconButton size="small" color="error" onClick={() => { setDeleteId(l.id); setDeleteOpen(true); }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ─── İzin Talebi Oluştur Dialog ─── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni İzin Talebi</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>

            {/* Saatlik izin toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={form.isSaatlik}
                  onChange={e => setForm({ ...EMPTY_FORM, isSaatlik: e.target.checked })}
                  color="info"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Schedule fontSize="small" color={form.isSaatlik ? 'info' : 'disabled'} />
                  <Typography variant="body2" color={form.isSaatlik ? 'info.main' : 'text.secondary'}>
                    Saatlik İzin
                  </Typography>
                </Box>
              }
            />

            <Divider />

            {form.isSaatlik ? (
              /* ── Saatlik izin formu ── */
              <>
                <TextField
                  type="date" label="Tarih" fullWidth required
                  InputLabelProps={{ shrink: true }}
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    type="time" label="Başlangıç Saati" fullWidth required
                    InputLabelProps={{ shrink: true }}
                    value={form.baslangicSaati}
                    onChange={e => setForm({ ...form, baslangicSaati: e.target.value })}
                  />
                  <TextField
                    type="time" label="Bitiş Saati" fullWidth required
                    InputLabelProps={{ shrink: true }}
                    value={form.bitisSaati}
                    onChange={e => setForm({ ...form, bitisSaati: e.target.value })}
                  />
                </Stack>
              </>
            ) : (
              /* ── Tam gün izin formu ── */
              <>
                <TextField
                  select label="İzin Türü" fullWidth
                  value={form.leaveType}
                  onChange={e => setForm({ ...form, leaveType: e.target.value })}
                >
                  {LEAVE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <Stack direction="row" spacing={2}>
                  <TextField
                    type="date" label="Başlangıç Tarihi" fullWidth required
                    InputLabelProps={{ shrink: true }}
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                  />
                  <TextField
                    type="date" label="Bitiş Tarihi" fullWidth required
                    InputLabelProps={{ shrink: true }}
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                  />
                </Stack>
                {previewDays > 0 && (
                  <Chip label={`Toplam: ${previewDays} iş günü`} color="info" variant="outlined" />
                )}
              </>
            )}

            <TextField
              label="Açıklama (isteğe bağlı)" fullWidth multiline rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? 'Gönderiliyor...' : 'Gönder'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── İnceleme Dialog (Yönetici) ─── */}
      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>İzin Talebini İncele</DialogTitle>
        <DialogContent dividers>
          {reviewTarget && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="body2"><strong>Personel:</strong> {reviewTarget.userFullName}</Typography>
                <Typography variant="body2"><strong>Tür:</strong> {reviewTarget.leaveType}</Typography>
                {reviewTarget.isSaatlik ? (
                  <Typography variant="body2">
                    <strong>Tarih:</strong> {fmt(reviewTarget.startDate)} &nbsp;
                    <strong>Saat:</strong> {reviewTarget.baslangicSaati} – {reviewTarget.bitisSaati}
                  </Typography>
                ) : (
                  <Typography variant="body2">
                    <strong>Tarih:</strong> {fmt(reviewTarget.startDate)} — {fmt(reviewTarget.endDate)} ({reviewTarget.daysCount} gün)
                  </Typography>
                )}
                {reviewTarget.description && <Typography variant="body2"><strong>Açıklama:</strong> {reviewTarget.description}</Typography>}
              </Paper>
              <TextField
                select label="Karar" fullWidth
                value={reviewForm.decision}
                onChange={e => setReviewForm({ ...reviewForm, decision: e.target.value })}
              >
                <MenuItem value="Onaylandı">✅ Onayla</MenuItem>
                <MenuItem value="Reddedildi">❌ Reddet</MenuItem>
              </TextField>
              <TextField
                label="Not (isteğe bağlı)" fullWidth multiline rows={2}
                value={reviewForm.reviewNote}
                onChange={e => setReviewForm({ ...reviewForm, reviewNote: e.target.value })}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewOpen(false)}>İptal</Button>
          <Button
            variant="contained"
            color={reviewForm.decision === 'Onaylandı' ? 'success' : 'error'}
            onClick={handleReview} disabled={saving}
          >
            {saving ? 'Kaydediliyor...' : reviewForm.decision === 'Onaylandı' ? 'Onayla' : 'Reddet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Silme Onay Dialog ─── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Talebi Sil</DialogTitle>
        <DialogContent>
          <DialogContentText>Bu izin talebini silmek istediğinize emin misiniz?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>İptal</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Sil</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
