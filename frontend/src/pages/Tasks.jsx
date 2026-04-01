import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Grid, Card, CardContent,
  Chip, IconButton, Dialog, DialogTitle, DialogContent,
  TextField, DialogActions, MenuItem, Tooltip, DialogContentText,
  Stack, FormControl, InputLabel, Select
} from '@mui/material';
import {
  Add, Delete, Edit, ArrowForward, ArrowBack,
  AccessTime, Warning, FilterList, PersonAdd
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import taskService from '../services/taskService';
import userService from '../services/userService';

const stringToColor = (string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('tr-TR');
};

function getRole() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      || payload['role']
      || null;
    return role;
  } catch { return null; }
}

const PRIORITY_COLORS = { Düşük: 'success', Orta: 'warning', Yüksek: 'error' };

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Form dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState({
    title: '', description: '', priority: 'Orta', status: 'Bekliyor',
    dueDate: '', assignedUserId: ''
  });

  // Silme dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Hızlı atama dialog (yönetici)
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignUserId, setAssignUserId] = useState('');

  const currentRole = getRole();
  const isManager = currentRole === 'Manager' || currentRole === 'Admin';

  useEffect(() => {
    fetchTasks();
    if (isManager) {
      userService.getAll().then(setUsers).catch(() => {});
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [filterStatus, filterPriority]);

  const fetchTasks = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const data = await taskService.getAll(params);
      setTasks(data);
    } catch (error) {
      console.error(error);
      toast.error('Görevler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({ title: '', description: '', priority: 'Orta', status: 'Bekliyor', dueDate: '', assignedUserId: '' });
    setIsEdit(false);
    setOpenDialog(true);
  };

  const handleOpenEdit = (task) => {
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      assignedUserId: task.assignedUserId || ''
    });
    setSelectedId(task.id);
    setIsEdit(true);
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.warning('Görev başlığı zorunludur.');
      return;
    }
    setSaving(true);
    try {
      const dataToSend = {
        ...formData,
        dueDate: formData.dueDate || null,
        assignedUserId: formData.assignedUserId || null
      };
      if (isEdit) {
        await taskService.update(selectedId, dataToSend);
        toast.success('Görev güncellendi.');
      } else {
        await taskService.create(dataToSend);
        toast.success('Görev oluşturuldu.');
      }
      setOpenDialog(false);
      fetchTasks();
    } catch (e) {
      toast.error(e.response?.data || 'İşlem başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await taskService.delete(deleteTargetId);
      toast.success('Görev silindi.');
      fetchTasks();
    } catch (e) {
      toast.error(e.response?.data || 'Silinemedi.');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  };

  const moveTask = async (task, direction) => {
    const statuses = ['Bekliyor', 'İşlemde', 'Bitti'];
    const currentIndex = statuses.indexOf(task.status);
    let newStatus = task.status;

    if (direction === 'next' && currentIndex < 2) newStatus = statuses[currentIndex + 1];
    if (direction === 'prev' && currentIndex > 0) newStatus = statuses[currentIndex - 1];

    if (newStatus !== task.status) {
      try {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        await taskService.update(task.id, {
          title: task.title,
          description: task.description || '',
          status: newStatus,
          priority: task.priority,
          dueDate: task.dueDate ? task.dueDate.split('T')[0] : null,
          assignedUserId: task.assignedUserId || null
        });
      } catch (e) {
        toast.error(e.response?.data || 'Durum güncellenemedi.');
        fetchTasks();
      }
    }
  };

  // Yönetici: havuzdan hızlı atama
  const handleOpenAssign = (task) => {
    setAssignTarget(task);
    setAssignUserId(task.assignedUserId || '');
    setAssignDialog(true);
  };

  const handleQuickAssign = async () => {
    setSaving(true);
    try {
      await taskService.update(assignTarget.id, {
        title: assignTarget.title,
        description: assignTarget.description || '',
        status: assignTarget.status,
        priority: assignTarget.priority,
        dueDate: assignTarget.dueDate ? assignTarget.dueDate.split('T')[0] : null,
        assignedUserId: assignUserId || null
      });
      toast.success(assignUserId ? 'Görev atandı.' : 'Atama kaldırıldı.');
      setAssignDialog(false);
      fetchTasks();
    } catch (e) {
      toast.error(e.response?.data || 'Atama başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const unassignedTasks = tasks.filter(t => !t.assignedUserId);
  const filteredTasks = (statusKey) => tasks.filter(t => t.status === statusKey);

  // Görev Kartı Sütunu
  const TaskColumn = ({ title, statusKey, color }) => (
    <Grid size={{ xs: 12, md: 4 }}>
      <Paper
        elevation={0}
        sx={{ p: 2, bgcolor: 'background.default', height: '100%', borderTop: `4px solid ${color}` }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">{title}</Typography>
          <Chip label={filteredTasks(statusKey).length} size="small" />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredTasks(statusKey).map((task) => (
            <Card key={task.id} sx={{ '&:hover': { boxShadow: 3 }, transition: '0.3s' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip
                    label={task.priority}
                    size="small"
                    color={PRIORITY_COLORS[task.priority] || 'default'}
                    variant="outlined"
                  />
                  {task.dueDate && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                      <AccessTime fontSize="inherit" /> {formatDate(task.dueDate)}
                    </Box>
                  )}
                </Box>

                <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.3, mb: 1 }}>
                  {task.title}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {task.description}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
                  <Tooltip title={task.assignedUserName || 'Atanmamış'}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{
                        width: 24, height: 24, borderRadius: '50%',
                        bgcolor: stringToColor(task.assignedUserName || 'X'),
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem'
                      }}>
                        {(task.assignedUserName || 'A')[0]}
                      </Box>
                      <Typography variant="caption" sx={{ maxWidth: 80, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {task.assignedUserName?.split(' ')[0]}
                      </Typography>
                    </Box>
                  </Tooltip>

                  <Box>
                    {statusKey !== 'Bekliyor' && (
                      <IconButton size="small" onClick={() => moveTask(task, 'prev')}><ArrowBack fontSize="small" /></IconButton>
                    )}
                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(task)}><Edit fontSize="small" /></IconButton>
                    {statusKey !== 'Bitti' && (
                      <IconButton size="small" color="success" onClick={() => moveTask(task, 'next')}><ArrowForward fontSize="small" /></IconButton>
                    )}
                    {/* Yönetici tüm kartları silebilir; staff sadece "Bitti" sütunundakileri */}
                    {(isManager || statusKey === 'Bitti') && (
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(task.id)}><Delete fontSize="small" /></IconButton>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
          {filteredTasks(statusKey).length === 0 && (
            <Typography variant="caption" color="text.secondary" align="center" sx={{ py: 2, display: 'block' }}>Görev yok</Typography>
          )}
        </Box>
      </Paper>
    </Grid>
  );

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">Görev Takip Panosu</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>Yeni Görev</Button>
      </Box>

      {/* Filtre Çubukları */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FilterList fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary" fontWeight={600}>Filtre:</Typography>
          {['', 'Bekliyor', 'İşlemde', 'Bitti'].map(s => (
            <Chip
              key={s || 'all'}
              label={s || 'Tümü'}
              onClick={() => setFilterStatus(s)}
              color={filterStatus === s ? 'primary' : 'default'}
              variant={filterStatus === s ? 'filled' : 'outlined'}
              size="small"
            />
          ))}
          <Box sx={{ width: 1, display: { xs: 'block', sm: 'none' } }} />
          {['', 'Düşük', 'Orta', 'Yüksek'].map(p => (
            <Chip
              key={p || 'allp'}
              label={p || 'Tüm Öncelikler'}
              onClick={() => setFilterPriority(p)}
              color={filterPriority === p ? 'secondary' : 'default'}
              variant={filterPriority === p ? 'filled' : 'outlined'}
              size="small"
            />
          ))}
        </Stack>
      </Paper>

      {/* Yönetici: Atanmamış Görev Havuzu */}
      {isManager && unassignedTasks.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: '2px dashed', borderColor: 'warning.main', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" color="warning.dark" sx={{ mb: 1.5 }}>
            Görev Havuzu — Atama Bekleyen ({unassignedTasks.length} görev)
          </Typography>
          <Stack spacing={0.5}>
            {unassignedTasks.map(task => (
              <Box
                key={task.id}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  p: 1, bgcolor: 'background.paper', borderRadius: 1,
                  border: '1px solid', borderColor: 'divider'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                  <Chip label={task.priority} size="small" color={PRIORITY_COLORS[task.priority] || 'default'} variant="outlined" />
                  <Typography variant="body2" noWrap sx={{ flex: 1 }}>{task.title}</Typography>
                  {task.dueDate && (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(task.dueDate)}
                    </Typography>
                  )}
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  startIcon={<PersonAdd />}
                  onClick={() => handleOpenAssign(task)}
                  sx={{ ml: 1, flexShrink: 0 }}
                >
                  Ata
                </Button>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      <Grid container spacing={3} sx={{ height: 'calc(100vh - 300px)', overflowY: 'auto' }}>
        <TaskColumn title="📌 Bekleyen İşler" statusKey="Bekliyor" color="#f59e0b" />
        <TaskColumn title="⚡ İşlemdekiler" statusKey="İşlemde" color="#3b82f6" />
        <TaskColumn title="✅ Tamamlananlar" statusKey="Bitti" color="#10b981" />
      </Grid>

      {/* Silme Onay Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="error" /> Görevi Sil
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Sil</Button>
        </DialogActions>
      </Dialog>

      {/* Görev Oluştur / Düzenle Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? 'Görevi Düzenle' : 'Yeni Görev Oluştur'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Görev Başlığı" required fullWidth
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Detaylar / Açıklama" fullWidth multiline rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                select label="Öncelik" fullWidth
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <MenuItem value="Düşük">Düşük</MenuItem>
                <MenuItem value="Orta">Orta</MenuItem>
                <MenuItem value="Yüksek">Yüksek</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                type="date" label="Son Tarih" fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </Grid>
            {/* Yönetici ise kullanıcı atama dropdown göster */}
            {isManager && (
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Atanan Kişi</InputLabel>
                  <Select
                    value={formData.assignedUserId || ''}
                    label="Atanan Kişi"
                    onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                  >
                    <MenuItem value="">— Atanmamış (Havuza Ekle) —</MenuItem>
                    {users.map(u => (
                      <MenuItem key={u.id} value={u.id}>{u.fullName} ({u.department})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            {!isManager && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  * Görev havuzuna eklenecek, yönetici tarafından atanabilir.
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>İptal</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hızlı Atama Dialog (Yönetici) */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAdd color="warning" /> Görev Ata
        </DialogTitle>
        <DialogContent dividers>
          {assignTarget && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                <Typography variant="body2" fontWeight={600}>{assignTarget.title}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip label={assignTarget.priority} size="small" color={PRIORITY_COLORS[assignTarget.priority] || 'default'} variant="outlined" />
                  <Chip label={assignTarget.status} size="small" variant="outlined" />
                </Box>
              </Paper>
              <FormControl fullWidth>
                <InputLabel>Atanan Kişi</InputLabel>
                <Select
                  value={assignUserId}
                  label="Atanan Kişi"
                  onChange={e => setAssignUserId(e.target.value)}
                >
                  <MenuItem value="">— Atanmamış —</MenuItem>
                  {users.map(u => (
                    <MenuItem key={u.id} value={u.id}>{u.fullName} ({u.department})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>İptal</Button>
          <Button onClick={handleQuickAssign} variant="contained" color="warning" disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
