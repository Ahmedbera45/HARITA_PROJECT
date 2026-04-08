import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, IconButton, Tooltip, TextField, MenuItem, Select,
  FormControl, InputLabel, Stack, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import { Delete, Edit, NavigateNext } from '@mui/icons-material';
import { toast } from 'react-toastify';
import taskService from '../services/taskService';
import userService from '../services/userService';
import PaginationBar from '../components/PaginationBar';
import api from '../services/api';

const PRIORITY_COLOR = { Düşük: 'default', Orta: 'warning', Yüksek: 'error' };
const STATUS_COLOR = { Bekliyor: 'warning', İşlemde: 'info', Bitti: 'success' };
const STATUS_NEXT = { Bekliyor: 'İşlemde', İşlemde: 'Bitti', Bitti: null };

export default function AllTasks() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [editTask, setEditTask] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        search: filterText || undefined,
        assignedUserId: filterUser || undefined,
      };
      const result = await api.get('/Task/paged', { params }).then(r => r.data);
      setItems(result.items);
      setTotal(result.total);
    } catch { toast.error('Görevler yüklenemedi.'); }
    finally { setLoading(false); }
  }, [filterStatus, filterPriority, filterText, filterUser, page, pageSize]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { userService.getAll().then(setUsers).catch(() => {}); }, []);

  const handleFilterChange = (setter) => (val) => { setter(val); setPage(1); };

  const handleMoveNext = async (task) => {
    const next = STATUS_NEXT[task.status];
    if (!next) return;
    try {
      await taskService.update(task.id, { ...task, status: next, assignedUserIds: task.assignedUsers.map(u => u.id) });
      load();
    } catch { toast.error('Durum güncellenemedi.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Görevi silmek istediğinize emin misiniz?')) return;
    try {
      await taskService.delete(id);
      toast.success('Görev silindi.');
      load();
    } catch { toast.error('Silinemedi.'); }
  };

  const openEdit = (task) => {
    setEditTask(task);
    setEditForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.substring(0, 10) : '',
      isHerkes: task.isHerkes,
      assignedUserIds: task.assignedUsers?.map(u => u.id) || [],
    });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await taskService.update(editTask.id, editForm);
      toast.success('Görev güncellendi.');
      setEditTask(null);
      load();
    } catch { toast.error('Güncellenemedi.'); }
    finally { setSaving(false); }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>Tüm Görevler</Typography>

      {/* Filtreler */}
      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
        <TextField
          size="small" label="Görev Ara" value={filterText}
          onChange={e => handleFilterChange(setFilterText)(e.target.value)} sx={{ width: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Durum</InputLabel>
          <Select label="Durum" value={filterStatus} onChange={e => handleFilterChange(setFilterStatus)(e.target.value)}>
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="Bekliyor">Bekliyor</MenuItem>
            <MenuItem value="İşlemde">İşlemde</MenuItem>
            <MenuItem value="Bitti">Bitti</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Öncelik</InputLabel>
          <Select label="Öncelik" value={filterPriority} onChange={e => handleFilterChange(setFilterPriority)(e.target.value)}>
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="Düşük">Düşük</MenuItem>
            <MenuItem value="Orta">Orta</MenuItem>
            <MenuItem value="Yüksek">Yüksek</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Kullanıcı</InputLabel>
          <Select label="Kullanıcı" value={filterUser} onChange={e => handleFilterChange(setFilterUser)(e.target.value)}>
            <MenuItem value="">Tümü</MenuItem>
            {users.map(u => <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {loading ? (
        <Box textAlign="center" p={4}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Alert severity="info">Görev bulunamadı.</Alert>
      ) : (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Görev</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Öncelik</TableCell>
                <TableCell>Atanan</TableCell>
                <TableCell>Başlatan</TableCell>
                <TableCell>Bitiş</TableCell>
                <TableCell align="right">İşlem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(t => (
                <TableRow key={t.id} hover>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" fontWeight={500}>{t.title}</Typography>
                    {t.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                        {t.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell><Chip size="small" label={t.status} color={STATUS_COLOR[t.status] || 'default'} /></TableCell>
                  <TableCell><Chip size="small" label={t.priority} color={PRIORITY_COLOR[t.priority] || 'default'} /></TableCell>
                  <TableCell>
                    {t.isHerkes
                      ? <Chip size="small" label="Herkes" color="secondary" />
                      : t.assignedUsers?.map(u => (
                          <Chip key={u.id} size="small" label={u.fullName} sx={{ mr: 0.5, mb: 0.5 }} />
                        ))
                    }
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{t.createdByName}</Typography>
                  </TableCell>
                  <TableCell>
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString('tr-TR') : '—'}
                  </TableCell>
                  <TableCell align="right">
                    {STATUS_NEXT[t.status] && (
                      <Tooltip title={`→ ${STATUS_NEXT[t.status]}`}>
                        <IconButton size="small" onClick={() => handleMoveNext(t)}>
                          <NavigateNext fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Düzenle">
                      <IconButton size="small" onClick={() => openEdit(t)}><Edit fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton size="small" color="error" onClick={() => handleDelete(t.id)}><Delete fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
        </Paper>
      )}

      {/* Düzenleme Dialog */}
      <Dialog open={!!editTask} onClose={() => setEditTask(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Görevi Düzenle</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField label="Başlık" value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} fullWidth />
            <TextField label="Açıklama" multiline rows={2} value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} fullWidth />
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Durum</InputLabel>
                <Select label="Durum" value={editForm.status || ''} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <MenuItem value="Bekliyor">Bekliyor</MenuItem>
                  <MenuItem value="İşlemde">İşlemde</MenuItem>
                  <MenuItem value="Bitti">Bitti</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Öncelik</InputLabel>
                <Select label="Öncelik" value={editForm.priority || ''} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
                  <MenuItem value="Düşük">Düşük</MenuItem>
                  <MenuItem value="Orta">Orta</MenuItem>
                  <MenuItem value="Yüksek">Yüksek</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField label="Bitiş Tarihi" type="date" value={editForm.dueDate || ''} onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth size="small" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTask(null)}>İptal</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
