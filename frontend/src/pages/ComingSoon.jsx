import { Box, Typography, Paper } from '@mui/material';
import { Construction } from '@mui/icons-material';

export default function ComingSoon({ title = 'Bu Sayfa' }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Paper
        elevation={0}
        sx={{ p: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 3, maxWidth: 400 }}
      >
        <Construction sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Bu modül henüz geliştirme aşamasındadır. Yakında hizmetinizde olacak.
        </Typography>
      </Paper>
    </Box>
  );
}
