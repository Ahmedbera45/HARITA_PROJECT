import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  DialogContentText, Tooltip, Stack, Avatar
} from '@mui/material';
import { Add, Delete, CheckCircle, Cancel, HourglassEmpty } from '@mui/icons-material';
import { toast } from 'react-toastify';
import leaveService from '../services/leaveService';

// JWT'den rol parse
function getRole() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const p = JSON.parse(atob(token.split('.')[1]));
    return p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || p['role'] || null;
  } catch { return null; }
}

const STATUS_CHIP = {
  Bekliyor:   { color: 'warning', icon: <HourglassEmpty fontSize="inherit" /> },
  Onaylandı:  { color: 'success', icon: <CheckCircle fontSize="inherit" /> },
  Reddedildi: { color: 'error',   icon: <Cancel fontSize="inherit" /> },
};

const LEAVE_TYPES = ['Yıllık İzin', 'Hastalık İzni', 'Mazeret İzni', 'Ücretsiz İzin'];

const fmt = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Oluştur dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leaveType: 'Yıllık İzin', startDate: '', endDate: '', description: '' });

  // Onay/Red dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ decision: 'Onaylandı', reviewNote: '' });

  // Sil dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const role = getRole();
  const isManager = role === 'Manager' || role === 'Admin';

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
    if (d.title) return d.title;
    return 'İşlem başarısız.';
  };

  const handleCreate = async () => {
    if (!form.startDate || !form.endDate) { toast.warning('Tarihler zorunludur.'); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { toast.warning('Bitiş tarihi başlangıçtan önce olamaz.'); return; }
    setSaving(true);
    try {
      await leaveService.create(form);
      toast.success('İzin talebi oluşturuldu.');
      setCreateOpen(false);
      setForm({ leaveType: 'Yıllık İzin', startDate: '', endDate: '', description: '' });
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

  // Gün hesapla (preview)
  const previewDays = form.startDate && form.endDate
    ? Math.max(0, Math.floor((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1)
    : 0;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">İzin Yönetimi</Typography>
          <Typography variant="body2" color="text.secondary">
            {isManager ? 'Tüm personel izin talepleri' : 'İzin talepleriniz'}
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
      </Stack>

      {/* Tablo */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              {isManager && <TableCell><strong>Personel</strong></TableCell>}
              <TableCell><strong>İzin Türü</strong></TableCell>
              <TableCell><strong>Başlangıç</strong></TableCell>
              <TableCell><strong>Bitiş</strong></TableCell>
              <TableCell><strong>Süre</strong></TableCell>
              <TableCell><strong>Durum</strong></TableCell>
              <TableCell><strong>Açıklama</strong></TableCell>
              <TableCell align="right"><strong>İşlem</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center">Yükleniyor...</TableCell></TableRow>
            ) : leaves.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ color: 'text.secondary', py: 4 }}>Kayıt bulunamadı</TableCell></TableRow>
            ) : leaves.map(l => (
              <TableRow key={l.id} hover>
                {isManager && (
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
                )}
                <TableCell>{l.leaveType}</TableCell>
                <TableCell>{fmt(l.startDate)}</TableCell>
                <TableCell>{fmt(l.endDate)}</TableCell>
                <TableCell><Chip label={`${l.daysCount} gün`} size="small" /></TableCell>
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
            <TextField
              select label="İzin Türü" fullWidth
              value={form.leaveType}
              onChange={e => setForm({ ...form, leaveType: e.target.value })}
            >
              {LEAVE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                type="date" label="Başlangıç Tarihi" fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
              />
              <TextField
                type="date" label="Bitiş Tarihi" fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
              />
            </Stack>
            {previewDays > 0 && (
              <Chip label={`Toplam: ${previewDays} iş günü`} color="info" variant="outlined" />
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
                <Typography variant="body2"><strong>Tarih:</strong> {fmt(reviewTarget.startDate)} — {fmt(reviewTarget.endDate)} ({reviewTarget.daysCount} gün)</Typography>
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
