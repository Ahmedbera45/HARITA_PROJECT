import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  DialogContentText, Tooltip, Stack, Switch,
  Chip, Divider, Grid, Card, CardContent
} from '@mui/material';
import {
  Add, Edit, Delete, Lock as LockIcon, Warning
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import permissionService from '../services/permissionService';

const MODULES = [
  { key: 'rehber',       label: 'Kurum Rehberi' },
  { key: 'gorev',        label: 'Görev Takip' },
  { key: 'izin',         label: 'İzin Yönetimi' },
  { key: 'harc',         label: 'Harç Hesaplama' },
  { key: 'veriYukleme',  label: 'Veri Yükleme' },
  { key: 'tevhid',       label: 'Tevhid Harcı' },
  { key: 'imarPlanlari', label: 'İmar Planları' },
  { key: 'ozelSayfalar', label: 'Özel Sayfalar' },
  { key: 'kullanicilar', label: 'Kullanıcı Yön.' },
];

const SYSTEM_ROLES = [
  {
    name: 'Admin',
    color: 'error',
    desc: 'Tüm modüllere tam erişim. Kullanıcı ve yetki yönetimi.',
  },
  {
    name: 'Manager',
    color: 'warning',
    desc: 'Tüm modüllere tam erişim. Yönetici işlemleri.',
  },
];

const EMPTY_PERMS = Object.fromEntries(MODULES.map(m => [m.key, { view: false, edit: false }]));

function buildEmptyForm() {
  return { name: '', description: '', permissions: { ...EMPTY_PERMS } };
}

const fmt = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

const getErrMsg = (e) => {
  const d = e?.response?.data;
  if (!d) return 'İşlem başarısız.';
  if (typeof d === 'string') return d;
  if (d.title) return d.title;
  return 'İşlem başarısız.';
};

export default function PermissionGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(buildEmptyForm());

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setGroups(await permissionService.getGroups());
    } catch { toast.error('Yetki grupları yüklenemedi.'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm(buildEmptyForm());
    setIsEdit(false);
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (g) => {
    // g.permissions is a dict from the API: { rehber: { view: true, edit: false }, ... }
    const perms = { ...EMPTY_PERMS };
    if (g.permissions) {
      Object.keys(g.permissions).forEach(k => {
        if (perms[k] !== undefined) {
          perms[k] = {
            view: !!(g.permissions[k]?.view),
            edit: !!(g.permissions[k]?.edit),
          };
        }
      });
    }
    setForm({ name: g.name, description: g.description || '', permissions: perms });
    setIsEdit(true);
    setEditId(g.id);
    setFormOpen(true);
  };

  const setModulePerm = (moduleKey, field, value) => {
    setForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: {
          ...prev.permissions[moduleKey],
          [field]: value,
          // edit requires view
          ...(field === 'edit' && value ? { view: true } : {}),
          // removing view also removes edit
          ...(field === 'view' && !value ? { edit: false } : {}),
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.warning('Grup adı zorunludur.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        permissions: form.permissions,
      };
      if (isEdit) {
        await permissionService.updateGroup(editId, payload);
        toast.success('Yetki grubu güncellendi.');
      } else {
        await permissionService.createGroup(payload);
        toast.success('Yetki grubu oluşturuldu.');
      }
      setFormOpen(false);
      fetchGroups();
    } catch (e) {
      toast.error(getErrMsg(e));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await permissionService.deleteGroup(deleteId);
      toast.success('Yetki grubu silindi.');
      fetchGroups();
    } catch (e) { toast.error(getErrMsg(e)); }
    finally { setDeleteOpen(false); setDeleteId(null); }
  };

  // Count enabled modules for display
  const countEnabled = (g) => {
    if (!g.permissions) return 0;
    return Object.values(g.permissions).filter(p => p?.view || p?.edit).length;
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="primary" /> Yetki Grupları
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Modül bazlı erişim grupları — Staff kullanıcılara atanır
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Yeni Grup
        </Button>
      </Box>

      {/* ─── Sistem Rolleri (okuma amaçlı) ─── */}
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Sistem Rolleri (Sabit)
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {SYSTEM_ROLES.map(r => (
          <Card key={r.name} variant="outlined" sx={{ flex: 1, borderColor: `${r.color}.main`, borderWidth: 1.5 }}>
            <CardContent sx={{ pb: '12px !important', pt: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Chip label={r.name} color={r.color} size="small" />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>— Sabit Rol</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{r.desc}</Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {MODULES.map(m => (
                  <Chip key={m.key} label={m.label} size="small" color="success" variant="outlined"
                    sx={{ fontSize: '0.68rem' }} />
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Divider sx={{ mb: 3 }} />
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Özel Yetki Grupları (Staff için)
      </Typography>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell><strong>Grup Adı</strong></TableCell>
              <TableCell><strong>Açıklama</strong></TableCell>
              <TableCell><strong>Aktif Modüller</strong></TableCell>
              <TableCell><strong>Oluşturma</strong></TableCell>
              <TableCell align="right"><strong>İşlemler</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center">Yükleniyor...</TableCell></TableRow>
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Henüz yetki grubu oluşturulmamış
                </TableCell>
              </TableRow>
            ) : groups.map(g => (
              <TableRow key={g.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{g.name}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{g.description || '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${countEnabled(g)} / ${MODULES.length} modül`}
                    size="small"
                    color={countEnabled(g) > 0 ? 'primary' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{fmt(g.createdAt)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                    <Tooltip title="Düzenle">
                      <IconButton size="small" color="primary" onClick={() => openEdit(g)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton size="small" color="error" onClick={() => { setDeleteId(g.id); setDeleteOpen(true); }}>
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

      {/* ─── Oluştur / Düzenle Dialog ─── */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{isEdit ? 'Yetki Grubunu Düzenle' : 'Yeni Yetki Grubu'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 0.5 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Grup Adı" required fullWidth
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="örn. Temel Okuma, Tam Erişim..."
              />
              <TextField
                label="Açıklama" fullWidth
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </Stack>

            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                Modül İzinleri
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={0}>
                  {/* Header row */}
                  <Grid item xs={5}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>MODÜL</Typography>
                  </Grid>
                  <Grid item xs={3.5} sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>GÖRÜNTÜLE</Typography>
                  </Grid>
                  <Grid item xs={3.5} sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>DÜZENLE</Typography>
                  </Grid>
                  <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

                  {MODULES.map((m, idx) => (
                    <Grid container item xs={12} key={m.key}
                      sx={{ py: 0.5, bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover', borderRadius: 1 }}>
                      <Grid item xs={5} sx={{ display: 'flex', alignItems: 'center', pl: 1 }}>
                        <Typography variant="body2">{m.label}</Typography>
                      </Grid>
                      <Grid item xs={3.5} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Switch
                          size="small"
                          checked={!!form.permissions[m.key]?.view}
                          onChange={e => setModulePerm(m.key, 'view', e.target.checked)}
                        />
                      </Grid>
                      <Grid item xs={3.5} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Switch
                          size="small"
                          color="success"
                          checked={!!form.permissions[m.key]?.edit}
                          onChange={e => setModulePerm(m.key, 'edit', e.target.checked)}
                        />
                      </Grid>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                "Düzenle" açılınca "Görüntüle" de otomatik açılır.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Silme Onay Dialog ─── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="error" /> Yetki Grubunu Sil
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bu yetki grubunu silmek istediğinize emin misiniz? Gruba atanmış kullanıcılar bu izinleri kaybeder.
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
