import { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, TextField, InputAdornment, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Avatar, IconButton, Tooltip, CircularProgress, Chip,
  DialogContentText // Silme uyarısı için metin alanı
} from '@mui/material';
import { 
  Search, Add, Delete, Business, Phone, Email, Edit, Warning // Edit ve Warning ikonlarını ekledik
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import contactService from '../services/contactService';

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

export default function Directory() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog Kontrolleri
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seçili Kayıt (Düzenleme veya Silme için)
  const [selectedId, setSelectedId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', title: '',
    institution: '', department: '',
    phoneNumber: '', email: '', description: ''
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const data = await contactService.getAll();
      setContacts(data);
    } catch (error) {
      console.error(error);
      toast.error("Liste yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // --- SİLME İŞLEMLERİ ---
  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true); // Şık uyarı penceresini aç
  };

  const handleDeleteConfirm = async () => {
    try {
      await contactService.delete(selectedId);
      toast.success("Kişi başarıyla silindi.");
      setOpenDeleteDialog(false);
      fetchContacts();
    } catch (error) {
      toast.error("Silme işlemi başarısız.");
    }
  };

  // --- DÜZENLEME / EKLEME İŞLEMLERİ ---
  const handleOpenCreate = () => {
    setFormData({ firstName: '', lastName: '', title: '', institution: '', department: '', phoneNumber: '', email: '', description: '' });
    setIsEditMode(false);
    setOpenFormDialog(true);
  };

  const handleOpenEdit = (row) => {
    // Formu seçilen kişinin bilgileriyle doldur
    setFormData({
      firstName: row.firstName,
      lastName: row.lastName,
      title: row.title || '',
      institution: row.institution || '',
      department: row.department || '', // Backend'den geliyorsa
      phoneNumber: row.phoneNumber || '',
      email: row.email || '',
      description: row.description || '' // Backend'den geliyorsa
    });
    setSelectedId(row.id);
    setIsEditMode(true);
    setOpenFormDialog(true);
  };

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName) {
      toast.warning("Ad ve Soyad zorunludur.");
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        // GÜNCELLEME
        await contactService.update(selectedId, formData);
        toast.success("Kayıt güncellendi.");
      } else {
        // YENİ EKLEME
        await contactService.create(formData);
        toast.success("Kişi başarıyla eklendi.");
      }
      setOpenFormDialog(false);
      fetchContacts();
    } catch (error) {
      toast.error(isEditMode ? "Güncelleme başarısız." : "Kayıt eklenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const filteredContacts = contacts.filter(c => 
    (c.firstName + ' ' + c.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.institution || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h5" fontWeight="bold">Kurum Rehberi</Typography>
          <Typography variant="body2" color="text.secondary">
            Kayıtlı kişi ve kurumlar ({filteredContacts.length})
          </Typography>
        </div>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            placeholder="İsim veya Kurum Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}
            sx={{ bgcolor: 'background.paper' }}
          />
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
            Yeni Kişi
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell>Kişi</TableCell>
              <TableCell>Unvan / Birim</TableCell>
              <TableCell>Kurum</TableCell>
              <TableCell>İletişim</TableCell>
              <TableCell>Notlar</TableCell> {/* YENİ KOLON */}
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow>
            ) : filteredContacts.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">Kayıt bulunamadı.</TableCell></TableRow>
            ) : (
              filteredContacts.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: stringToColor(row.firstName), width: 32, height: 32, fontSize: '0.9rem' }}>
                        {row.firstName[0]}{row.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="600">
                          {row.firstName} {row.lastName}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.title || '-'}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.department}</Typography>
                  </TableCell>
                  <TableCell>
                     {row.institution && <Chip icon={<Business sx={{fontSize: 16}} />} label={row.institution} size="small" variant="outlined" />}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {row.phoneNumber && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.85rem' }}>
                          <Phone fontSize="inherit" color="action" /> {row.phoneNumber}
                        </Box>
                      )}
                      {row.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.85rem' }}>
                          <Email fontSize="inherit" color="action" /> {row.email}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                     {row.description || '-'}
                    </Typography>
                    </TableCell>
                  <TableCell align="right">
                    {/* DÜZENLE BUTONU */}
                    <Tooltip title="Düzenle">
                      <IconButton size="small" color="primary" onClick={() => handleOpenEdit(row)} sx={{ mr: 1 }}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {/* SİL BUTONU */}
                    <Tooltip title="Sil">
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(row.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- FORM DIALOG (EKLEME VE DÜZENLEME İÇİN ORTAK) --- */}
      <Dialog open={openFormDialog} onClose={() => setOpenFormDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditMode ? 'Kişiyi Düzenle' : 'Yeni Kişi Ekle'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField label="Ad" required fullWidth value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Soyad" required fullWidth value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Kurum" fullWidth value={formData.institution} onChange={(e) => setFormData({...formData, institution: e.target.value})} InputProps={{ startAdornment: <InputAdornment position="start"><Business /></InputAdornment> }} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Birim" fullWidth value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Unvan" fullWidth value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Telefon" fullWidth value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} InputProps={{ startAdornment: <InputAdornment position="start"><Phone /></InputAdornment> }} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="E-Posta" fullWidth value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} InputProps={{ startAdornment: <InputAdornment position="start"><Email /></InputAdornment> }} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Not / Açıklama" fullWidth multiline rows={2} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFormDialog(false)}>İptal</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? "İşleniyor..." : (isEditMode ? "Güncelle" : "Kaydet")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- SİLME ONAY DIALOG --- */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <Warning /> Silme Onayı
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bu kişiyi rehberden silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="inherit">Vazgeç</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" autoFocus>
            Evet, Sil
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}