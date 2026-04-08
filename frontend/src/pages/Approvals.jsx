import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableHead, TableRow,
  TableCell, TableBody, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, RadioGroup,
  FormControlLabel, Radio, FormLabel, CircularProgress, Alert,
} from '@mui/material';
import { CheckCircle, Cancel, RateReview } from '@mui/icons-material';
import { toast } from 'react-toastify';
import leaveService from '../services/leaveService';
import tevhidService from '../services/tevhidService';

const STATUS_COLOR = {
  'Bekliyor': 'warning',
  'Onaylandı': 'success',
  'Reddedildi': 'error',
  'Düzeltme İstendi': 'info',
};

export default function Approvals() {
  const [tab, setTab] = useState(0);

  // İzin
  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [reviewLeave, setReviewLeave] = useState(null);
  const [leaveDecision, setLeaveDecision] = useState('Onaylandı');
  const [leaveNote, setLeaveNote] = useState('');
  const [leaveSaving, setLeaveSaving] = useState(false);

  // Tevhid
  const [tevhids, setTevhids] = useState([]);
  const [tevhidsLoading, setTevhidsLoading] = useState(true);
  const [reviewTevhid, setReviewTevhid] = useState(null);
  const [tevhidDecision, setTevhidDecision] = useState('Onaylandı');
  const [tevhidSenaryo, setTevhidSenaryo] = useState(1);
  const [tevhidNote, setTevhidNote] = useState('');
  const [tevhidSaving, setTevhidSaving] = useState(false);

  const loadLeaves = useCallback(async () => {
    setLeavesLoading(true);
    try {
      const all = await leaveService.getAll();
      setLeaves(all.filter(l => l.status === 'Bekliyor'));
    } catch { toast.error('İzinler yüklenemedi.'); }
    finally { setLeavesLoading(false); }
  }, []);

  const loadTevhids = useCallback(async () => {
    setTevhidsLoading(true);
    try {
      const all = await tevhidService.getAll();
      setTevhids(all.filter(t => t.status === 'Bekliyor'));
    } catch { toast.error('Tevhid hesaplamaları yüklenemedi.'); }
    finally { setTevhidsLoading(false); }
  }, []);

  useEffect(() => { loadLeaves(); loadTevhids(); }, [loadLeaves, loadTevhids]);

  // İzin onay
  const handleLeaveReview = async () => {
    if (!reviewLeave) return;
    setLeaveSaving(true);
    try {
      await leaveService.review(reviewLeave.id, { decision: leaveDecision, reviewNote: leaveNote });
      toast.success(`İzin talebi ${leaveDecision}.`);
      setReviewLeave(null);
      loadLeaves();
    } catch (e) { toast.error(e.response?.data || 'Hata oluştu.'); }
    finally { setLeaveSaving(false); }
  };

  // Tevhid onay
  const handleTevhidReview = async () => {
    if (!reviewTevhid) return;
    setTevhidSaving(true);
    try {
      await tevhidService.review(reviewTevhid.id, {
        decision: tevhidDecision,
        onaylananSenaryo: tevhidDecision === 'Onaylandı' ? tevhidSenaryo : null,
        reviewNote: tevhidNote,
      });
      toast.success('Tevhid harcı incelendi.');
      setReviewTevhid(null);
      loadTevhids();
    } catch (e) { toast.error(e.response?.data || 'Hata oluştu.'); }
    finally { setTevhidSaving(false); }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>Onay Yönetimi</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`İzin Onay Bekliyor (${leaves.length})`} />
        <Tab label={`Tevhid Harcı Onay Bekliyor (${tevhids.length})`} />
      </Tabs>

      {/* İzin Tablosu */}
      {tab === 0 && (
        <Paper>
          {leavesLoading ? (
            <Box p={4} textAlign="center"><CircularProgress /></Box>
          ) : leaves.length === 0 ? (
            <Alert severity="success" sx={{ m: 2 }}>Bekleyen izin talebi yok.</Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Personel</TableCell>
                  <TableCell>İzin Türü</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Gün</TableCell>
                  <TableCell>Açıklama</TableCell>
                  <TableCell align="right">İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaves.map(l => (
                  <TableRow key={l.id} hover>
                    <TableCell>{l.userFullName}</TableCell>
                    <TableCell>{l.leaveType}</TableCell>
                    <TableCell>
                      {l.isSaatlik
                        ? `${new Date(l.startDate).toLocaleDateString('tr-TR')} ${l.baslangicSaati}-${l.bitisSaati}`
                        : `${new Date(l.startDate).toLocaleDateString('tr-TR')} – ${new Date(l.endDate).toLocaleDateString('tr-TR')}`}
                    </TableCell>
                    <TableCell>{l.isSaatlik ? 'Saatlik' : `${l.daysCount} gün`}</TableCell>
                    <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {l.description || '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small" variant="outlined"
                        startIcon={<RateReview />}
                        onClick={() => { setReviewLeave(l); setLeaveDecision('Onaylandı'); setLeaveNote(''); }}
                      >İncele</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}

      {/* Tevhid Tablosu */}
      {tab === 1 && (
        <Paper>
          {tevhidsLoading ? (
            <Box p={4} textAlign="center"><CircularProgress /></Box>
          ) : tevhids.length === 0 ? (
            <Alert severity="success" sx={{ m: 2 }}>Bekleyen tevhid harcı yok.</Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Ada / Parsel / Mahalle</TableCell>
                  <TableCell>Malik</TableCell>
                  <TableCell>Katsayı</TableCell>
                  <TableCell>Rayiç Bedel</TableCell>
                  <TableCell>Oluşturan</TableCell>
                  <TableCell align="right">İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tevhids.map(t => (
                  <TableRow key={t.id} hover>
                    <TableCell>{t.ada} / {t.parselNo} / {t.mahalle}</TableCell>
                    <TableCell>{t.malikAdi || '—'}</TableCell>
                    <TableCell>{t.katsayi}</TableCell>
                    <TableCell>{t.rayicBedel?.toLocaleString('tr-TR')} ₺/m²</TableCell>
                    <TableCell>{t.createdByName || '—'}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small" variant="outlined"
                        startIcon={<RateReview />}
                        onClick={() => { setReviewTevhid(t); setTevhidDecision('Onaylandı'); setTevhidSenaryo(1); setTevhidNote(''); }}
                      >İncele</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}

      {/* İzin İnceleme Dialog */}
      <Dialog open={!!reviewLeave} onClose={() => setReviewLeave(null)} maxWidth="sm" fullWidth>
        <DialogTitle>İzin Talebini İncele</DialogTitle>
        <DialogContent dividers>
          {reviewLeave && (
            <Box display="flex" flexDirection="column" gap={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">Personel</Typography>
                <Typography>{reviewLeave.userFullName}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">İzin Türü</Typography>
                <Typography>{reviewLeave.leaveType}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Tarih / Süre</Typography>
                <Typography>
                  {reviewLeave.isSaatlik
                    ? `${new Date(reviewLeave.startDate).toLocaleDateString('tr-TR')} ${reviewLeave.baslangicSaati}-${reviewLeave.bitisSaati} (Saatlik)`
                    : `${new Date(reviewLeave.startDate).toLocaleDateString('tr-TR')} – ${new Date(reviewLeave.endDate).toLocaleDateString('tr-TR')} (${reviewLeave.daysCount} gün)`}
                </Typography>
              </Box>
              <Box>
                <FormLabel>Karar</FormLabel>
                <RadioGroup row value={leaveDecision} onChange={e => setLeaveDecision(e.target.value)}>
                  <FormControlLabel value="Onaylandı" control={<Radio color="success" />} label="✅ Onayla" />
                  <FormControlLabel value="Reddedildi" control={<Radio color="error" />} label="❌ Reddet" />
                </RadioGroup>
              </Box>
              <TextField
                label="Not (opsiyonel)"
                multiline rows={2}
                value={leaveNote}
                onChange={e => setLeaveNote(e.target.value)}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewLeave(null)}>İptal</Button>
          <Button
            variant="contained"
            color={leaveDecision === 'Onaylandı' ? 'success' : 'error'}
            startIcon={leaveDecision === 'Onaylandı' ? <CheckCircle /> : <Cancel />}
            onClick={handleLeaveReview}
            disabled={leaveSaving}
          >
            {leaveSaving ? <CircularProgress size={20} /> : leaveDecision === 'Onaylandı' ? 'Onayla' : 'Reddet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tevhid İnceleme Dialog */}
      <Dialog open={!!reviewTevhid} onClose={() => setReviewTevhid(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Tevhid Harcı İncele</DialogTitle>
        <DialogContent dividers>
          {reviewTevhid && (
            <Box display="flex" flexDirection="column" gap={2}>
              <Typography variant="subtitle1" fontWeight="bold">
                {reviewTevhid.ada} / {reviewTevhid.parselNo} / {reviewTevhid.mahalle}
              </Typography>
              <Box display="flex" gap={3}>
                <Box flex={1}>
                  <Typography variant="body2" color="text.secondary">S1 (Arsa)</Typography>
                  <Typography fontWeight="bold">{reviewTevhid.arsaHarc?.toLocaleString('tr-TR')} ₺</Typography>
                </Box>
                <Box flex={1}>
                  <Typography variant="body2" color="text.secondary">S2 (TAKS)</Typography>
                  <Typography fontWeight="bold">{reviewTevhid.taksHarc?.toLocaleString('tr-TR')} ₺</Typography>
                </Box>
                <Box flex={1}>
                  <Typography variant="body2" color="text.secondary">S3 (Çekmeler)</Typography>
                  <Typography fontWeight="bold">{reviewTevhid.cekmelerHarc?.toLocaleString('tr-TR')} ₺</Typography>
                </Box>
              </Box>
              <Box>
                <FormLabel>Karar</FormLabel>
                <RadioGroup value={tevhidDecision} onChange={e => setTevhidDecision(e.target.value)}>
                  <FormControlLabel value="Onaylandı" control={<Radio color="success" />} label="Onayla" />
                  <FormControlLabel value="Reddedildi" control={<Radio color="error" />} label="Reddet" />
                  <FormControlLabel value="Düzeltme İstendi" control={<Radio color="info" />} label="Düzeltme İste" />
                </RadioGroup>
              </Box>
              {tevhidDecision === 'Onaylandı' && (
                <Box>
                  <FormLabel>Onaylanan Senaryo</FormLabel>
                  <RadioGroup row value={tevhidSenaryo} onChange={e => setTevhidSenaryo(Number(e.target.value))}>
                    <FormControlLabel value={1} control={<Radio />} label="S1" />
                    <FormControlLabel value={2} control={<Radio />} label="S2" />
                    <FormControlLabel value={3} control={<Radio />} label="S3" />
                  </RadioGroup>
                </Box>
              )}
              <TextField
                label="Not (opsiyonel)"
                multiline rows={2}
                value={tevhidNote}
                onChange={e => setTevhidNote(e.target.value)}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewTevhid(null)}>İptal</Button>
          <Button
            variant="contained"
            color={tevhidDecision === 'Onaylandı' ? 'success' : tevhidDecision === 'Reddedildi' ? 'error' : 'info'}
            onClick={handleTevhidReview}
            disabled={tevhidSaving}
          >
            {tevhidSaving ? <CircularProgress size={20} /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
