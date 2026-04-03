import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Button, Card, CardContent, CardActions,
  CircularProgress, Alert, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import TableChartIcon from '@mui/icons-material/TableChart';
import dynamicPageService from '../services/dynamicPageService';
import { useAuth } from '../hooks/useAuth';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('tr-TR');

export default function DynamicPages() {
  const navigate = useNavigate();
  const { isManager } = useAuth();

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, title: '' });

  useEffect(() => { loadPages(); }, []);

  const loadPages = () => {
    setLoading(true);
    dynamicPageService.getAllPages()
      .then(setPages)
      .catch(() => setError('Sayfalar yüklenemedi'))
      .finally(() => setLoading(false));
  };

  const handleDelete = async () => {
    try {
      await dynamicPageService.deletePage(deleteDialog.id);
      setDeleteDialog({ open: false, id: null, title: '' });
      loadPages();
    } catch {
      setError('Silme başarısız.');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Özel Sayfalar</Typography>
        {isManager && (
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => navigate('/pages/create')}>
            Yeni Sayfa
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : pages.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
          <TableChartIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
          <Typography>Henüz sayfa oluşturulmamış.</Typography>
          {isManager && (
            <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/pages/create')}>
              İlk Sayfayı Oluştur
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {pages.map(page => (
            <Grid item xs={12} sm={6} md={4} key={page.id}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom noWrap>{page.title}</Typography>
                  {page.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {page.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    <Chip size="small" label={`${page.rowCount} satır`} />
                    <Chip size="small" label={`${page.columns.length} sütun`} variant="outlined" />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {page.createdBy} — {formatDate(page.createdAt)}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <Tooltip title="Görüntüle">
                    <IconButton size="small" onClick={() => navigate(`/pages/${page.id}`)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {isManager && (
                    <Tooltip title="Sil">
                      <IconButton size="small" color="error"
                        onClick={() => setDeleteDialog({ open: true, id: page.id, title: page.title })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Silme onayı */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, title: '' })}>
        <DialogTitle>Sayfa Sil</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deleteDialog.title}</strong> sayfasını ve tüm verilerini silmek istediğinizden emin misiniz?
            Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, title: '' })}>İptal</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Sil</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
