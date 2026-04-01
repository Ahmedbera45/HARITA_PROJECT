import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  DialogContentText, Tooltip, Stack, Avatar
} from '@mui/material';
import {
  Add, Edit, Delete, Key, AdminPanelSettings,
  CheckCircle, Cancel, Warning
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import userService from '../services/userService';

const DEPARTMENTS = [
  'İmar ve Şehircilik Md.',
  'Fen İşleri Md.',
  'Harita Planlama Servisi',
  'Emlak ve İstimlak Md.',
  'Bilgi İşlem',
  'Mali Hizmetler Md.',
  'İnsan Kaynakları Md.',
];

const ROLES = ['Admin', 'Manager', 'Staff'];

const ROLE_COLORS = {
  Admin:   'error',
  Manager: 'warning',
  Staff:   'info',
};

const ROLE_LABELS = {
  Admin:   'Yönetici (Admin)',
  Manager: 'Müdür (Manager)',
  Staff:   'Personel (Staff)',
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

const getErrMsg = (e) => {
  const d = e?.response?.data;
  if (!d) return 'İşlem başarısız.';
  if (typeof d === 'string') return d;
  if (d.title) return d.title;
  return 'İşlem başarısız.';
};

const EMPTY_FORM = { name: '', surname: '', email: '', password: '', department: '', role: 'Staff', isActive: true };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Oluştur / Düzenle dialog
  const [formOpen, setFormOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Şifre sıfırlama dialog
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdUserId, setPwdUserId] = useState(null);
  const [newPwd, setNewPwd] = useState('');

  // Silme dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setUsers(await userService.getAll());
    } catch { toast.error('Kullanıcılar yüklenemedi.'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setIsEdit(false);
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (u) => {
    setForm({
      name: u.name,
      surname: u.surname,
      email: u.email,
      password: '',
      department: u.department || '',
      role: u.roles?.[0] || 'Staff',
      isActive: u.isActive,
    });
    setIsEdit(true);
    setEditId(u.id);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.surname.trim() || !form.email.trim()) {
      toast.warning('Ad, soyad ve e-posta zorunludur.');
      return;
    }
    if (!isEdit && !form.password.trim()) {
      toast.warning('Yeni kullanıcı için şifre zorunludur.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await userService.update(editId, {
          name: form.name,
          surname: form.surname,
          email: form.email,
          department: form.department || null,
          role: form.role,
          isActive: form.isActive,
        });
        toast.success('Kullanıcı güncellendi.');
      } else {
        await userService.create({
          name: form.name,
          surname: form.surname,
          email: form.email,
          password: form.password,
          department: form.department || null,
          role: form.role,
        });
        toast.success('Kullanıcı oluşturuldu.');
      }
      setFormOpen(false);
      fetchUsers();
    } catch (e) {
      toast.error(getErrMsg(e));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await userService.delete(deleteId);
      toast.success('Kullanıcı silindi.');
      fetchUsers();
    } catch (e) { toast.error(getErrMsg(e)); }
    finally { setDeleteOpen(false); setDeleteId(null); }
  };

  const handlePasswordChange = async () => {
    if (!newPwd.trim() || newPwd.length < 6) {
      toast.warning('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    setSaving(true);
    try {
      await userService.changePassword(pwdUserId, newPwd);
      toast.success('Şifre güncellendi.');
      setPwdOpen(false);
      setNewPwd('');
    } catch (e) { toast.error(getErrMsg(e)); }
    finally { setSaving(false); }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AdminPanelSettings color="primary" /> Kullanıcı Yönetimi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Personel hesapları ve rol tanımlamaları
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Yeni Kullanıcı
        </Button>
      </Box>

      {/* Rol Açıklamaları */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {ROLES.map(r => (
          <Chip key={r} label={ROLE_LABELS[r]} color={ROLE_COLORS[r]} variant="outlined" size="small" />
        ))}
      </Stack>

      {/* Kullanıcı Tablosu */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell><strong>Personel</strong></TableCell>
              <TableCell><strong>E-Posta</strong></TableCell>
              <TableCell><strong>Birim</strong></TableCell>
              <TableCell><strong>Rol</strong></TableCell>
              <TableCell><strong>Durum</strong></TableCell>
              <TableCell><strong>Kayıt Tarihi</strong></TableCell>
              <TableCell align="right"><strong>İşlemler</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center">Yükleniyor...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Kayıt bulunamadı</TableCell></TableRow>
            ) : users.map(u => (
              <TableRow key={u.id} hover sx={{ opacity: u.isActive ? 1 : 0.5 }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.light', fontSize: '0.9rem' }}>
                      {(u.name || '?')[0]}{(u.surname || '')[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{u.fullName}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{u.email}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{u.department || '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {(u.roles || []).map(r => (
                      <Chip key={r} label={r} size="small" color={ROLE_COLORS[r] || 'default'} />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    label={u.isActive ? 'Aktif' : 'Pasif'}
                    size="small"
                    color={u.isActive ? 'success' : 'default'}
                    icon={u.isActive ? <CheckCircle fontSize="inherit" /> : <Cancel fontSize="inherit" />}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{fmt(u.createdAt)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                    <Tooltip title="Düzenle / Rol Değiştir">
                      <IconButton size="small" color="primary" onClick={() => openEdit(u)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Şifre Sıfırla">
                      <IconButton size="small" color="warning" onClick={() => { setPwdUserId(u.id); setNewPwd(''); setPwdOpen(true); }}>
                        <Key fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton size="small" color="error" onClick={() => { setDeleteId(u.id); setDeleteOpen(true); }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ─── Kullanıcı Oluştur / Düzenle Dialog ─── */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Oluştur'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Ad" required fullWidth
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
              <TextField
                label="Soyad" required fullWidth
                value={form.surname}
                onChange={e => setForm({ ...form, surname: e.target.value })}
              />
            </Stack>
            <TextField
              label="E-Posta" required fullWidth type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            {!isEdit && (
              <TextField
                label="Şifre" required fullWidth type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                helperText="En az 6 karakter"
              />
            )}
            <TextField
              select label="Birim / Müdürlük" fullWidth
              value={form.department}
              onChange={e => setForm({ ...form, department: e.target.value })}
            >
              <MenuItem value="">— Seçiniz —</MenuItem>
              {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
            <TextField
              select label="Rol" fullWidth required
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              helperText={
                form.role === 'Admin' ? 'Tüm sayfalara erişim, kullanıcı yönetimi' :
                form.role === 'Manager' ? 'İzin onayı, veri yükleme, harç hesaplama' :
                'Temel görev ve izin işlemleri'
              }
            >
              {ROLES.map(r => (
                <MenuItem key={r} value={r}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={r} size="small" color={ROLE_COLORS[r]} />
                    <span>{ROLE_LABELS[r]}</span>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            {isEdit && (
              <TextField
                select label="Hesap Durumu" fullWidth
                value={form.isActive}
                onChange={e => setForm({ ...form, isActive: e.target.value })}
              >
                <MenuItem value={true}>Aktif</MenuItem>
                <MenuItem value={false}>Pasif (Devre Dışı)</MenuItem>
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Şifre Sıfırla Dialog ─── */}
      <Dialog open={pwdOpen} onClose={() => setPwdOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Key color="warning" /> Şifre Sıfırla
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Yeni Şifre" type="password" fullWidth
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            helperText="En az 6 karakter"
            sx={{ mt: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPwdOpen(false)}>İptal</Button>
          <Button variant="contained" color="warning" onClick={handlePasswordChange} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Silme Onay Dialog ─── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="error" /> Kullanıcıyı Sil
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bu kullanıcıyı silmek istediğinize emin misiniz? Kullanıcı devre dışı bırakılacak ve sisteme giremeyecek.
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
