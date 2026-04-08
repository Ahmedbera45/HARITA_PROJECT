import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Stack, TextField, Button,
  CircularProgress, Alert, Divider, Chip, Tooltip,
} from '@mui/material';
import {
  Settings as SettingsIcon, Save, FolderOpen,
  CheckCircle, Error as ErrorIcon, NetworkCheck,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import settingsService from '../services/settingsService';

const PREDEFINED_PATHS = [
  { label: 'cbfiles',      path: '\\\\192.168.0.81\\cbfiles' },
  { label: 'planlama',     path: '\\\\192.168.0.121\\planlama' },
  { label: 'cayirovagis',  path: '\\\\192.168.0.81\\cayirovagis' },
  { label: 'netcadweb',    path: '\\\\192.168.0.223\\netcadweb' },
];

export default function Settings() {
  const [networkPath, setNetworkPath] = useState('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [testing, setTesting]         = useState(false);
  const [testResult, setTestResult]   = useState(null); // null | 'ok' | 'fail'
  const [error, setError]             = useState('');

  useEffect(() => {
    settingsService.getNetworkStoragePath()
      .then(data => setNetworkPath(data?.value ?? data ?? ''))
      .catch(() => setError('Mevcut ayar yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  // Yol değiştiğinde test sonucunu sıfırla
  const handlePathChange = (val) => { setNetworkPath(val); setTestResult(null); };

  const handleTest = async () => {
    if (!networkPath.trim()) { toast.warning('Test etmek için yol girin.'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await settingsService.testNetworkPath(networkPath.trim());
      setTestResult(ok ? 'ok' : 'fail');
      if (ok) toast.success('Ağ klasörüne erişim başarılı.');
      else    toast.error('Ağ klasörüne erişilemiyor. Yol veya ağ bağlantısını kontrol edin.');
    } catch {
      setTestResult('fail');
      toast.error('Erişim testi yapılamadı.');
    } finally { setTesting(false); }
  };

  const handleSave = async () => {
    if (!networkPath.trim()) { toast.warning('Yol boş olamaz.'); return; }
    setSaving(true);
    try {
      await settingsService.updateNetworkStoragePath(networkPath.trim());
      toast.success('Ağ arşiv yolu güncellendi.');
    } catch (e) {
      toast.error(e.response?.data?.message || e.response?.data || 'Güncellenemedi.');
    } finally { setSaving(false); }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight="bold">Sistem Ayarları</Typography>
          <Typography variant="body2" color="text.secondary">Admin tarafından yönetilen sistem konfigürasyonları</Typography>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 640 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderOpen color="action" fontSize="small" /> Ağ Arşiv Klasörü
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          İmar planı arşiv dosyalarının bulunduğu ortak ağ klasörünün UNC yolunu seçin veya girin.
          Tüm kullanıcılar bu yol üzerinden dosyalara erişir.
        </Typography>

        {/* Hızlı seçim */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            Standart ağ paylaşımları:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {PREDEFINED_PATHS.map(p => (
              <Chip
                key={p.path}
                label={p.label}
                size="small"
                variant={networkPath === p.path ? 'filled' : 'outlined'}
                color={networkPath === p.path ? 'primary' : 'default'}
                onClick={() => handlePathChange(p.path)}
                sx={{ cursor: 'pointer', fontFamily: 'monospace' }}
              />
            ))}
          </Stack>
        </Box>

        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box textAlign="center" py={3}><CircularProgress size={28} /></Box>
        ) : (
          <Stack spacing={2}>
            <TextField
              label="Ağ Klasör Yolu"
              value={networkPath}
              onChange={e => handlePathChange(e.target.value)}
              fullWidth
              placeholder="\\192.168.0.81\cbfiles"
              helperText="UNC yolu: \\SUNUCU\Paylasim veya Z:\KlasörAdı"
              InputProps={{
                endAdornment: testResult === 'ok'
                  ? <CheckCircle color="success" fontSize="small" sx={{ mr: 1 }} />
                  : testResult === 'fail'
                  ? <ErrorIcon color="error" fontSize="small" sx={{ mr: 1 }} />
                  : null,
              }}
            />

            <Stack direction="row" spacing={1}>
              <Tooltip title="Sunucunun bu ağ klasörüne erişip erişemediğini test eder">
                <Button
                  variant="outlined"
                  startIcon={testing ? <CircularProgress size={16} /> : <NetworkCheck />}
                  onClick={handleTest}
                  disabled={testing || saving}
                >
                  {testing ? 'Test Ediliyor...' : 'Erişim Test Et'}
                </Button>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                onClick={handleSave}
                disabled={saving || testing}
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </Stack>

            {testResult === 'ok' && (
              <Alert severity="success">Ağ klasörüne erişim başarılı. Yolu kaydedebilirsiniz.</Alert>
            )}
            {testResult === 'fail' && (
              <Alert severity="error">
                Ağ klasörüne erişilemiyor. Yolu ve ağ bağlantısını kontrol edin.
                <br />
                <strong>Not:</strong> API sunucusunun bu ağ paylaşımına erişim yetkisi olmalıdır.
              </Alert>
            )}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
