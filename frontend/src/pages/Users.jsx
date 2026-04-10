import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  DialogContentText, Tooltip, Stack, Avatar, Autocomplete
} from '@mui/material';
import {
  Add, Edit, Delete, Key, AdminPanelSettings,
  CheckCircle, Cancel, Warning
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import userService from '../services/userService';
import permissionService from '../services/permissionService';
import PaginationBar from '../components/PaginationBar';

const DEPARTMENTS = [
  'İmar ve Şehircilik Md.',
  'Fen İşleri Md.',
  'Harita Planlama Servisi',
  'Emlak ve İstimlak Md.',
  'Bilgi İşlem',
  'Mali Hizmetler Md.',
  'İnsan Kaynakları Md.',
];

const ROLES = ['Müdür', 'Şef', 'Harita Mühendisi', 'Harita Teknikeri', 'Memur', 'Şehir Plancısı'];

const ROLE_COLORS = {
  Admin:              'error',
  Müdür:              'warning',
  Şef:                'warning',
  'Harita Mühendisi': 'info',
  'Harita Teknikeri': 'info',
  Memur:              'default',
  'Şehir Plancısı':   'secondary',
};

const ROLE_LABELS = {
  Admin:              'Admin (Sistem)',
  Müdür:              'Müdür',
  Şef:                'Şef',
  'Harita Mühendisi': 'Harita Mühendisi',
  'Harita Teknikeri': 'Harita Teknikeri',
  Memur:              'Memur',
  'Şehir Plancısı':   'Şehir Plancısı',
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

const getErrMsg = (e) => {
  const d = e?.response?.data;
  if (!d) return 'İşlem başarısız.';
  if (typeof d === 'string') return d;
  if (d.title) return d.title;
  return 'İşlem başarısız.';
};

const MANAGER_ROLES = ['Müdür', 'Şef'];
const EMPTY_FORM = {
  name: '', surname: '', email: '', password: '', department: '', role: 'Memur', isActive: true,
  kalanIzinGunu: 0, izinYenilemeTarihi: '', izinYenilenecekGun: 0
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allGroups, setAllGroups] = useState([]);

  // Filtreler
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Oluştur / Düzenle dialog
  const [formOpen, setFormOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedGroups, setSelectedGroups] = useState([]);

  // Şifre sıfırlama dialog
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdUserId, setPwdUserId] = useState(null);
  const [newPwd, setNewPwd] = useState('');

  // Silme dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await userService.getPaged({
        search: search || undefined,
        role: filterRole || undefined,
        page,
        pageSize,
      });
      setUsers(result.items);
      setTotal(result.total);
    } catch { toast.error('Kullanıcılar yüklenemedi.'); }
    finally { setLoading(false); }
  }, [search, filterRole, page, pageSize]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { permissionService.getGroups().then(setAllGroups).catch(() => {}); }, []);

  const handleFilterChange = (setter) => (val) => { setter(val); setPage(1); };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSelectedGroups([]);
    setIsEdit(false);
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = async (u) => {
    setForm({
      name: u.name,
      surname: u.surname,
      email: u.email,
      password: '',
      department: u.department || '',
      role: u.roles?.[0] || 'Memur',
      isActive: u.isActive,
      kalanIzinGunu: u.kalanIzinGunu ?? 0,
      izinYenilemeTarihi: u.izinYenilemeTarihi ? u.izinYenilemeTarihi.substring(0, 10) : '',
      izinYenilenecekGun: u.izinYenilenecekGun ?? 0,
    });
    setIsEdit(true);
    setEditId(u.id);
    setSelectedGroups([]);
    setFormOpen(true);
    // getUserGroups returns full PermissionGroupDto[] objects — use them directly
    try {
      const [freshGroups, userGroups] = await Promise.all([
        allGroups.length > 0 ? Promise.resolve(allGroups) : permissionService.getGroups(),
        permissionService.getUserGroups(u.id),
      ]);
      if (allGroups.length === 0) setAllGroups(freshGroups);
      setSelectedGroups(userGroups);
    } catch {
      setSelectedGroups([]);
    }
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
      const isStaffRole = !MANAGER_ROLES.includes(form.role) && form.role !== 'Admin';
      if (isEdit) {
        await userService.update(editId, {
          name: form.name,
          surname: form.surname,
          email: form.email,
          department: form.department || null,
          role: form.role,
          isActive: form.isActive,
          kalanIzinGunu: Number(form.kalanIzinGunu) || 0,
          izinYenilemeTarihi: form.izinYenilemeTarihi || null,
          izinYenilenecekGun: Number(form.izinYenilenecekGun) || 0,
        });
        // Assign permission groups (Staff only)
        if (isStaffRole) {
          await permissionService.setUserGroups(editId, selectedGroups.map(g => g.id));
        }
        toast.success('Kullanıcı güncellendi.');
      } else {
        const created = await userService.create({
          name: form.name,
          surname: form.surname,
          email: form.email,
          password: form.password,
          department: form.department || null,
          role: form.role,
          kalanIzinGunu: Number(form.kalanIzinGunu) || 0,
          izinYenilemeTarihi: form.izinYenilemeTarihi || null,
          izinYenilenecekGun: Number(form.izinYenilenecekGun) || 0,
        });
        // Assign groups to new user if Staff and groups selected
        if (isStaffRole && selectedGroups.length > 0 && created?.id) {
          await permissionService.setUserGroups(created.id, selectedGroups.map(g => g.id));
        }
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

      {/* Arama ve Filtreler */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
        <TextField
          size="small" label="Ad / E-Posta Ara" value={search}
          onChange={e => handleFilterChange(setSearch)(e.target.value)} sx={{ width: 220 }}
        />
        <TextField
          select size="small" label="Rol" value={filterRole}
          onChange={e => handleFilterChange(setFilterRole)(e.target.value)} sx={{ width: 180 }}
        >
          <MenuItem value="">Tümü</MenuItem>
          {['Admin', ...ROLES].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
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
        <PaginationBar total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
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
                MANAGER_ROLES.includes(form.role) ? 'İzin onayı, veri yükleme, harç hesaplama' :
                'Temel görev ve izin işlemleri'
              }
            >
              {ROLES.map(r => (
                <MenuItem key={r} value={r}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={r} size="small" color={ROLE_COLORS[r] || 'default'} />
                    <span>{ROLE_LABELS[r] || r}</span>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            {isEdit && (
              <TextField
                select label="Hesap Durumu" fullWidth
                value={String(form.isActive)}
                onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })}
              >
                <MenuItem value="true">Aktif</MenuItem>
                <MenuItem value="false">Pasif (Devre Dışı)</MenuItem>
              </TextField>
            )}
            <Stack direction="row" spacing={2}>
              <TextField
                label="Kalan İzin Günü" type="number" fullWidth size="small"
                value={form.kalanIzinGunu}
                onChange={e => setForm({ ...form, kalanIzinGunu: e.target.value })}
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Yenilenecek Gün" type="number" fullWidth size="small"
                value={form.izinYenilenecekGun}
                onChange={e => setForm({ ...form, izinYenilenecekGun: e.target.value })}
                inputProps={{ min: 0 }}
              />
            </Stack>
            <TextField
              label="İzin Yenileme Tarihi" type="date" fullWidth size="small"
              value={form.izinYenilemeTarihi}
              onChange={e => setForm({ ...form, izinYenilemeTarihi: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            {!MANAGER_ROLES.includes(form.role) && form.role !== 'Admin' && (
              <Autocomplete
                multiple
                options={allGroups}
                getOptionLabel={(o) => o.name}
                value={selectedGroups}
                onChange={(_, val) => setSelectedGroups(val)}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Yetki Grupları"
                    placeholder="Grup seçin..."
                    helperText="Boş bırakılırsa kullanıcı hiçbir modüle erişemez."
                  />
                )}
              />
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
