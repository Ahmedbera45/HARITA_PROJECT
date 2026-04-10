import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, Chip, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, RadioGroup, Stack,
  FormControlLabel, Radio, FormLabel, CircularProgress, Alert, Divider,
  Collapse, IconButton, Tooltip, Grid,
} from '@mui/material';
import { CheckCircle, Cancel, RateReview, KeyboardArrowDown, KeyboardArrowUp, OpenInNew } from '@mui/icons-material';
import { toast } from 'react-toastify';
import leaveService from '../services/leaveService';
import tevhidService from '../services/tevhidService';

const fmt = (val) =>
  val == null ? '—' : new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(val) + ' ₺';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('tr-TR') : '—';

function LeaveRow({ l, onReview }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell sx={{ py: 0.5 }}>
          <IconButton size="small" onClick={() => setOpen(o => !o)}>
            {open ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>{l.userFullName}</Typography>
          {l.department && <Typography variant="caption" color="text.secondary">{l.department}</Typography>}
        </TableCell>
        <TableCell>{l.leaveType}</TableCell>
        <TableCell>
          {l.isSaatlik
            ? `${fmtDate(l.startDate)} ${l.baslangicSaati || ''}–${l.bitisSaati || ''}`
            : `${fmtDate(l.startDate)} – ${fmtDate(l.endDate)}`}
        </TableCell>
        <TableCell>{l.isSaatlik ? 'Saatlik' : `${l.daysCount} gün`}</TableCell>
        <TableCell>{l.kalanIzinGunu != null ? `${l.kalanIzinGunu} gün` : '—'}</TableCell>
        <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {l.description || '—'}
        </TableCell>
        <TableCell align="right">
          <Button size="small" variant="outlined" startIcon={<RateReview />} onClick={() => onReview(l)}>
            İncele
          </Button>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ m: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Tam Açıklama</Typography>
                  <Typography variant="body2">{l.description || '—'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Kalan İzin</Typography>
                  <Typography variant="body2">{l.kalanIzinGunu != null ? `${l.kalanIzinGunu} gün` : '—'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Departman</Typography>
                  <Typography variant="body2">{l.department || '—'}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function TevhidRow({ t, onReview }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell sx={{ py: 0.5 }}>
          <IconButton size="small" onClick={() => setOpen(o => !o)}>
            {open ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>{t.ada}/{t.parselNo}</Typography>
          <Typography variant="caption" color="text.secondary">{t.mahalle}</Typography>
          {t.parseller?.length > 1 && (
            <Chip label={`+${t.parseller.length - 1} parsel`} size="small" sx={{ ml: 0.5, fontSize: 10 }} />
          )}
        </TableCell>
        <TableCell>{t.malikAdi || '—'}</TableCell>
        <TableCell>{t.katsayi}</TableCell>
        <TableCell>{t.rayicBedel?.toLocaleString('tr-TR')} ₺/m²</TableCell>
        <TableCell>{fmt(t.arsaHarc)}</TableCell>
        <TableCell>{fmt(t.taksHarc)}</TableCell>
        <TableCell>{fmt(t.cekmelerHarc)}</TableCell>
        <TableCell>
          {t.dosyaYolu ? (
            <Tooltip title="Eki Görüntüle">
              <IconButton size="small" component="a" href={t.dosyaYolu} target="_blank" rel="noopener">
                <OpenInNew fontSize="small" color="primary" />
              </IconButton>
            </Tooltip>
          ) : '—'}
        </TableCell>
        <TableCell>{t.olusturanKullanici}</TableCell>
        <TableCell align="right">
          <Button size="small" variant="outlined" startIcon={<RateReview />} onClick={() => onReview(t)}>
            İncele
          </Button>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={11} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ m: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              {/* Parsel Listesi */}
              {t.parseller?.length > 0 && (
                <>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">PARSELLER</Typography>
                  <TableContainer sx={{ mt: 0.5, mb: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['Ada', 'Parsel', 'Mahalle', 'Eski Ada', 'Eski Parsel', 'Malik', 'Plan Fonk.'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 600, fontSize: 11 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {t.parseller.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell>{p.ada}</TableCell>
                            <TableCell>{p.parselNo}</TableCell>
                            <TableCell>{p.mahalle || '—'}</TableCell>
                            <TableCell>{p.eskiAda || '—'}</TableCell>
                            <TableCell>{p.eskiParsel || '—'}</TableCell>
                            <TableCell>{p.malikAdi || '—'}</TableCell>
                            <TableCell>{p.planFonksiyonu || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
              <Grid container spacing={1}>
                {t.notlar && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Notlar</Typography>
                    <Typography variant="body2">{t.notlar}</Typography>
                  </Grid>
                )}
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Oluşturan</Typography>
                  <Typography variant="body2">{t.olusturanKullanici}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Tarih</Typography>
                  <Typography variant="body2">{fmtDate(t.createdAt)}</Typography>
                </Grid>
                {t.dosyaYolu && (
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Ek Belge</Typography>
                    <Box>
                      <Button size="small" startIcon={<OpenInNew />} component="a" href={t.dosyaYolu} target="_blank" rel="noopener">
                        Görüntüle
                      </Button>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

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

      {/* ─── İzin Tablosu ─── */}
      {tab === 0 && (
        <Paper>
          {leavesLoading ? (
            <Box p={4} textAlign="center"><CircularProgress /></Box>
          ) : leaves.length === 0 ? (
            <Alert severity="success" sx={{ m: 2 }}>Bekleyen izin talebi yok.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', width: 40 }} />
                    {['Personel', 'İzin Türü', 'Tarih', 'Gün', 'Kalan İzin', 'Açıklama', 'İşlem'].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 600 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaves.map(l => (
                    <LeaveRow key={l.id} l={l} onReview={(row) => { setReviewLeave(row); setLeaveDecision('Onaylandı'); setLeaveNote(''); }} />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ─── Tevhid Tablosu ─── */}
      {tab === 1 && (
        <Paper>
          {tevhidsLoading ? (
            <Box p={4} textAlign="center"><CircularProgress /></Box>
          ) : tevhids.length === 0 ? (
            <Alert severity="success" sx={{ m: 2 }}>Bekleyen tevhid harcı yok.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', width: 40 }} />
                    {['Parseller', 'Malik', 'Katsayı', 'Rayiç Bedel', 'S1 Arsa', 'S2 TAKS', 'S3 Çekme', 'Dosya', 'Oluşturan', 'İşlem'].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 600 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tevhids.map(t => (
                    <TevhidRow key={t.id} t={t} onReview={(row) => { setReviewTevhid(row); setTevhidDecision('Onaylandı'); setTevhidSenaryo(1); setTevhidNote(''); }} />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ─── İzin İnceleme Dialog ─── */}
      <Dialog open={!!reviewLeave} onClose={() => setReviewLeave(null)} maxWidth="sm" fullWidth>
        <DialogTitle>İzin Talebini İncele</DialogTitle>
        <DialogContent dividers>
          {reviewLeave && (
            <Stack spacing={2}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Personel</Typography>
                  <Typography fontWeight={600}>{reviewLeave.userFullName}</Typography>
                  {reviewLeave.department && <Typography variant="caption" color="text.secondary">{reviewLeave.department}</Typography>}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">İzin Türü</Typography>
                  <Typography>{reviewLeave.leaveType}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Tarih / Süre</Typography>
                  <Typography variant="body2">
                    {reviewLeave.isSaatlik
                      ? `${fmtDate(reviewLeave.startDate)} ${reviewLeave.baslangicSaati || ''}–${reviewLeave.bitisSaati || ''} (Saatlik)`
                      : `${fmtDate(reviewLeave.startDate)} – ${fmtDate(reviewLeave.endDate)} (${reviewLeave.daysCount} gün)`}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Kalan İzin Günü</Typography>
                  <Typography variant="body2">{reviewLeave.kalanIzinGunu != null ? `${reviewLeave.kalanIzinGunu} gün` : '—'}</Typography>
                </Grid>
                {reviewLeave.description && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Açıklama</Typography>
                    <Typography variant="body2">{reviewLeave.description}</Typography>
                  </Grid>
                )}
              </Grid>
              <Divider />
              <Box>
                <FormLabel>Karar</FormLabel>
                <RadioGroup row value={leaveDecision} onChange={e => setLeaveDecision(e.target.value)}>
                  <FormControlLabel value="Onaylandı" control={<Radio color="success" />} label="Onayla" />
                  <FormControlLabel value="Reddedildi" control={<Radio color="error" />} label="Reddet" />
                </RadioGroup>
              </Box>
              <TextField
                label="Not (opsiyonel)" multiline rows={2}
                value={leaveNote} onChange={e => setLeaveNote(e.target.value)} fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewLeave(null)}>İptal</Button>
          <Button
            variant="contained"
            color={leaveDecision === 'Onaylandı' ? 'success' : 'error'}
            startIcon={leaveDecision === 'Onaylandı' ? <CheckCircle /> : <Cancel />}
            onClick={handleLeaveReview} disabled={leaveSaving}
          >
            {leaveSaving ? <CircularProgress size={20} /> : leaveDecision === 'Onaylandı' ? 'Onayla' : 'Reddet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Tevhid İnceleme Dialog ─── */}
      <Dialog open={!!reviewTevhid} onClose={() => setReviewTevhid(null)} maxWidth="md" fullWidth>
        <DialogTitle>Tevhid Harcı İncele</DialogTitle>
        <DialogContent dividers>
          {reviewTevhid && (
            <Stack spacing={2}>
              {/* Parsel listesi */}
              {reviewTevhid.parseller?.length > 0 ? (
                <>
                  <Typography variant="subtitle2">Parseller</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {['Ada', 'Parsel', 'Mahalle', 'Malik', 'Plan Fonk.'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reviewTevhid.parseller.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell>{p.ada}</TableCell>
                            <TableCell>{p.parselNo}</TableCell>
                            <TableCell>{p.mahalle || '—'}</TableCell>
                            <TableCell>{p.malikAdi || '—'}</TableCell>
                            <TableCell>{p.planFonksiyonu || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Typography variant="subtitle1" fontWeight="bold">
                  {reviewTevhid.ada} / {reviewTevhid.parselNo} / {reviewTevhid.mahalle}
                </Typography>
              )}

              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Katsayı</Typography>
                  <Typography>{reviewTevhid.katsayi}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Rayiç Bedel</Typography>
                  <Typography>{fmt(reviewTevhid.rayicBedel)}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Oluşturan</Typography>
                  <Typography>{reviewTevhid.olusturanKullanici}</Typography>
                </Grid>
              </Grid>

              {/* Senaryo tablosu */}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Senaryo</TableCell>
                      <TableCell align="right">m²</TableCell>
                      <TableCell align="right">Hesaplanan Harç</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { label: 'S1: Arsa', m2: reviewTevhid.arsaM2, harc: reviewTevhid.arsaHarc },
                      { label: 'S2: TAKS', m2: reviewTevhid.taksM2, harc: reviewTevhid.taksHarc },
                      { label: 'S3: Çekmeler', m2: reviewTevhid.cekmelerM2, harc: reviewTevhid.cekmelerHarc },
                    ].map(row => (
                      <TableRow key={row.label}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell align="right">{row.m2}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt(row.harc)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {reviewTevhid.dosyaYolu && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Ek Belge</Typography>
                  <Box>
                    <Button size="small" startIcon={<OpenInNew />} component="a" href={reviewTevhid.dosyaYolu} target="_blank" rel="noopener">
                      Belgeyi Görüntüle
                    </Button>
                  </Box>
                </Box>
              )}

              {reviewTevhid.notlar && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Notlar</Typography>
                  <Typography variant="body2">{reviewTevhid.notlar}</Typography>
                </Box>
              )}

              <Divider />
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
                    <FormControlLabel value={1} control={<Radio />} label="S1: Arsa" />
                    <FormControlLabel value={2} control={<Radio />} label="S2: TAKS" />
                    <FormControlLabel value={3} control={<Radio />} label="S3: Çekmeler" />
                  </RadioGroup>
                </Box>
              )}
              <TextField
                label="Not (opsiyonel)" multiline rows={2}
                value={tevhidNote} onChange={e => setTevhidNote(e.target.value)} fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewTevhid(null)}>İptal</Button>
          <Button
            variant="contained"
            color={tevhidDecision === 'Onaylandı' ? 'success' : tevhidDecision === 'Reddedildi' ? 'error' : 'info'}
            onClick={handleTevhidReview} disabled={tevhidSaving}
          >
            {tevhidSaving ? <CircularProgress size={20} /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
