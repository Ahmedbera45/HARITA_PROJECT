import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, IconButton, Tooltip,
  Switch, FormControlLabel, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, CircularProgress,
  List, ListItem, ListItemText, ListItemSecondaryAction, Divider,
  Alert,
} from '@mui/material';
import { Add, Delete, Layers, Upload, Map as MapIcon, Public, Storage } from '@mui/icons-material';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toast } from 'react-toastify';
import mapService from '../services/mapService';
import gisService from '../services/gisService';

// Fix Leaflet default icon issue with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function FitBoundsToGeoJson({ geoJson }) {
  const map = useMap();
  useEffect(() => {
    if (!geoJson?.features?.length) return;
    try {
      const layer = L.geoJSON(geoJson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    } catch { /* ignore invalid geometries */ }
  }, [geoJson, map]);
  return null;
}

export default function Map() {
  const [layers, setLayers] = useState([]);
  // layerGeoJsons: { [layerId]: parsedGeoJsonObject } — lazy cache
  const [layerGeoJsons, setLayerGeoJsons] = useState({});
  const [parcelGeoJson, setParcelGeoJson] = useState(null);
  const [parcelCount, setParcelCount] = useState(null); // { total, withGeometry }
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add layer dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState('shp');
  const [addName, setAddName] = useState('');
  const [addWmsUrl, setAddWmsUrl] = useState('');
  const [shpFile, setShpFile] = useState(null);
  const [addSaving, setAddSaving] = useState(false);

  // GIS katman ekleme (dialog)
  const [gisTables, setGisTables] = useState([]);
  const [gisTablesLoading, setGisTablesLoading] = useState(false);
  const [selectedGisTable, setSelectedGisTable] = useState('');
  const [gisLimit, setGisLimit] = useState(10000);

  // Selected parcel popup
  const [selectedParcel, setSelectedParcel] = useState(null);

  const fileInputRef = useRef();

  // Katmanı DB'den çek ve GeoJSON'ını lazy-load et
  const fetchLayerGeoJson = async (layerId) => {
    if (layerGeoJsons[layerId]) return; // zaten yüklü
    try {
      const gj = await mapService.getLayerGeoJson(layerId);
      setLayerGeoJsons(prev => ({ ...prev, [layerId]: gj }));
    } catch { /* sessizce geç */ }
  };

  const fetchLayers = async () => {
    setLoading(true);
    try {
      const list = await mapService.getLayers();
      setLayers(list);
      // Görünür ve GeoJSON'ı olan katmanları lazy-load et
      list.filter(l => l.isVisible && l.hasGeoJson).forEach(l => fetchLayerGeoJson(l.id));
    } catch { toast.error('Katmanlar yüklenemedi.'); }
    finally { setLoading(false); }
  };

  const fetchParcelCount = async () => {
    try { setParcelCount(await mapService.getParcelCount()); }
    catch { /* sessizce geç */ }
  };

  useEffect(() => { fetchLayers(); fetchParcelCount(); }, []);

  const loadParcels = async () => {
    setLoadingParcels(true);
    try {
      const gj = await mapService.getParcelsGeoJson();
      setParcelGeoJson(gj);
      toast.success('Parsel katmanı yüklendi.');
    } catch { toast.error('Parsel verileri yüklenemedi.'); }
    finally { setLoadingParcels(false); }
  };

  const handleOpenAddDialog = () => {
    setAddType('shp');
    setAddName('');
    setAddWmsUrl('');
    setShpFile(null);
    setSelectedGisTable('');
    setGisTables([]);
    setAddOpen(true);
  };

  const handleAddTypeChange = async (type) => {
    setAddType(type);
    if (type === 'gis' && gisTables.length === 0) {
      setGisTablesLoading(true);
      try {
        const tables = await gisService.getTables();
        // Sadece geometri sütunu olan tabloları göster
        setGisTables(tables);
      } catch {
        toast.error('GIS tabloları yüklenemedi. Sunucu bağlantısını kontrol edin.');
      } finally { setGisTablesLoading(false); }
    }
  };

  const handleAddLayer = async () => {
    if (!addName.trim()) { toast.warning('Katman adı zorunludur.'); return; }
    setAddSaving(true);
    try {
      if (addType === 'shp') {
        if (!shpFile) { toast.warning('SHP ZIP dosyası seçin.'); setAddSaving(false); return; }
        await mapService.uploadShp(shpFile);
        toast.success('SHP katmanı yüklendi.');
        setAddOpen(false);
        setAddName('');
        setShpFile(null);
        fetchLayers();
      } else if (addType === 'wms') {
        if (!addWmsUrl.trim()) { toast.warning('WMS URL zorunludur.'); setAddSaving(false); return; }
        await mapService.createLayer({ name: addName, layerType: 'wms', wmsUrl: addWmsUrl });
        toast.success('WMS katmanı eklendi.');
        setAddOpen(false);
        setAddName('');
        setAddWmsUrl('');
        fetchLayers();
      } else if (addType === 'gis') {
        if (!selectedGisTable) { toast.warning('Tablo seçin.'); setAddSaving(false); return; }
        const [schema, table] = selectedGisTable.split('||');
        toast.info('GIS verisi yükleniyor, lütfen bekleyin...');
        const geoJson = await gisService.getGeoJson(schema, table, gisLimit);
        const count = geoJson?.features?.length ?? 0;
        if (count === 0) { toast.warning('Bu tabloda geometri verisi bulunamadı.'); setAddSaving(false); return; }
        // DB'ye kaydet — kalıcı katman
        const saved = await mapService.createLayer({
          name: addName,
          layerType: 'gis',
          geoJsonData: JSON.stringify(geoJson),
        });
        toast.success(`"${addName}" katmanı kaydedildi (${count.toLocaleString('tr-TR')} obje).`);
        setAddOpen(false);
        setAddName('');
        setSelectedGisTable('');
        // Yeni katmanı listeye ekle ve GeoJSON'ı cache'e al
        const newLayer = { ...saved, hasGeoJson: true, isVisible: true, layerType: 'gis' };
        setLayers(prev => [...prev, newLayer]);
        setLayerGeoJsons(prev => ({ ...prev, [saved.id]: geoJson }));
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Katman eklenemedi.');
    } finally { setAddSaving(false); }
  };

  const handleToggleLayer = async (layer) => {
    try {
      await mapService.updateLayer(layer.id, { ...layer, isVisible: !layer.isVisible });
      const nowVisible = !layer.isVisible;
      setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, isVisible: nowVisible } : l));
      // Görünür yapılıyorsa ve GeoJSON yüklü değilse çek
      if (nowVisible && layer.hasGeoJson) fetchLayerGeoJson(layer.id);
    } catch { toast.error('Katman güncellenemedi.'); }
  };

  const handleDeleteLayer = async (id) => {
    if (!window.confirm('Bu katmanı silmek istediğinize emin misiniz?')) return;
    try {
      await mapService.deleteLayer(id);
      setLayers(prev => prev.filter(l => l.id !== id));
      toast.success('Katman silindi.');
    } catch { toast.error('Katman silinemedi.'); }
  };

  const onEachParcel = (feature, layer) => {
    layer.on('click', () => {
      setSelectedParcel(feature.properties);
    });
    const p = feature.properties;
    if (p) {
      layer.bindTooltip(
        `${p.ada || '?'} / ${p.parselNo || '?'} — ${p.mahalle || ''}`,
        { sticky: true, direction: 'top' }
      );
    }
  };

  const parcelStyle = () => ({
    color: '#1565c0',
    weight: 1.5,
    fillColor: '#42a5f5',
    fillOpacity: 0.25,
  });

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 2 }}>
      {/* Left Panel — Layer List */}
      <Paper sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Layers fontSize="small" /> Katmanlar
            </Typography>
            <Tooltip title="Yeni Katman Ekle">
              <IconButton size="small" color="primary" onClick={handleOpenAddDialog}>
                <Add />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {/* Built-in Parcel Layer */}
          <ListItem dense>
            <ListItemText
              primary="Parseller (DB)"
              secondary={
                parcelGeoJson
                  ? `${parcelGeoJson.features?.length || 0} geometrili parsel`
                  : parcelCount
                    ? `${parcelCount.total.toLocaleString('tr-TR')} parsel (${parcelCount.withGeometry} geometrili)`
                    : 'Yüklenmedi'
              }
            />
            <ListItemSecondaryAction>
              {loadingParcels ? (
                <CircularProgress size={18} />
              ) : (
                <Tooltip title={parcelGeoJson ? 'Yenile' : 'Haritaya Yükle'}>
                  <IconButton size="small" onClick={loadParcels}>
                    <Public fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </ListItemSecondaryAction>
          </ListItem>
          <Divider />

          {loading ? (
            <Box textAlign="center" py={2}><CircularProgress size={20} /></Box>
          ) : (
            <List dense disablePadding>
              {layers.map(l => (
                <ListItem key={l.id} dense>
                  <FormControlLabel
                    control={
                      <Switch size="small" checked={l.isVisible} onChange={() => handleToggleLayer(l)} />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>{l.name}</Typography>
                        <Stack direction="row" spacing={0.5}>
                          <Chip label={l.layerType} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                          {l.hasGeoJson && layerGeoJsons[l.id] && (
                            <Chip
                              label={`${layerGeoJsons[l.id]?.features?.length?.toLocaleString('tr-TR') ?? 0} obj`}
                              size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }}
                            />
                          )}
                        </Stack>
                      </Box>
                    }
                    sx={{ flex: 1, mr: 0 }}
                  />
                  <Tooltip title="Sil">
                    <IconButton size="small" color="error" onClick={() => handleDeleteLayer(l.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItem>
              ))}
              {layers.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>
                  Henüz katman yok.
                </Typography>
              )}
            </List>
          )}
        </Box>
      </Paper>

      {/* Map Area */}
      <Box sx={{ flex: 1, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <MapContainer
          center={[39.92, 32.85]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {parcelGeoJson && (
            <>
              <FitBoundsToGeoJson geoJson={parcelGeoJson} />
              <GeoJSON
                key={JSON.stringify(parcelGeoJson).slice(0, 50)}
                data={parcelGeoJson}
                style={parcelStyle}
                onEachFeature={onEachParcel}
              />
            </>
          )}

          {layers.filter(l => l.isVisible && layerGeoJsons[l.id]).map(l => {
            const gj = layerGeoJsons[l.id];
            const isGis = l.layerType === 'gis';
            return (
              <GeoJSON
                key={`${l.id}-${JSON.stringify(gj).slice(0, 20)}`}
                data={gj}
                style={isGis
                  ? { color: '#6a1b9a', weight: 1.5, fillColor: '#ce93d8', fillOpacity: 0.3 }
                  : { color: '#e65100', weight: 2, fillOpacity: 0.2 }
                }
                onEachFeature={(feature, layer) => {
                  if (feature.properties) {
                    const lines = Object.entries(feature.properties)
                      .filter(([, v]) => v != null).slice(0, 6)
                      .map(([k, v]) => `<b>${k}:</b> ${v}`).join('<br/>');
                    if (lines) layer.bindPopup(lines);
                  }
                }}
              />
            );
          })}
        </MapContainer>
      </Box>

      {/* Parcel Detail Panel */}
      {selectedParcel && (
        <Paper sx={{ width: 240, flexShrink: 0, p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight="bold">Parsel Detayı</Typography>
            <IconButton size="small" onClick={() => setSelectedParcel(null)}>✕</IconButton>
          </Box>
          <Divider />
          {[
            ['Ada', selectedParcel.ada],
            ['Parsel No', selectedParcel.parselNo],
            ['Mahalle', selectedParcel.mahalle],
            ['Malik', selectedParcel.malikAdi],
            ['Alan (m²)', selectedParcel.alan ? Number(selectedParcel.alan).toLocaleString('tr-TR') : null],
          ].map(([label, value]) => value ? (
            <Box key={label}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="body2" fontWeight={500}>{value}</Typography>
            </Box>
          ) : null)}
        </Paper>
      )}

      {/* Add Layer Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Katman Ekle</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              select label="Katman Türü" fullWidth value={addType}
              onChange={e => handleAddTypeChange(e.target.value)}
            >
              <MenuItem value="shp">SHP Dosyası (ZIP)</MenuItem>
              <MenuItem value="wms">WMS Katmanı</MenuItem>
              <MenuItem value="gis">GIS Sunucusu (cayirovagis)</MenuItem>
            </TextField>

            <TextField
              label="Katman Adı" fullWidth value={addName}
              onChange={e => setAddName(e.target.value)}
            />

            {addType === 'shp' && (
              <Box>
                <Button variant="outlined" startIcon={<Upload />} onClick={() => fileInputRef.current?.click()}>
                  {shpFile ? shpFile.name : 'ZIP Dosyası Seç'}
                </Button>
                <input ref={fileInputRef} type="file" accept=".zip" style={{ display: 'none' }}
                  onChange={e => setShpFile(e.target.files?.[0] || null)} />
              </Box>
            )}

            {addType === 'wms' && (
              <TextField label="WMS URL" fullWidth value={addWmsUrl}
                onChange={e => setAddWmsUrl(e.target.value)}
                placeholder="https://example.com/wms?service=WMS&..." />
            )}

            {addType === 'gis' && (
              <>
                <Alert severity="info" icon={<Storage />}>
                  cayirovagis sunucusundaki tablolar listeleniyor. Geometri sütunu olan tablolar haritaya yüklenebilir.
                </Alert>
                {gisTablesLoading ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Tablolar yükleniyor...</Typography>
                  </Box>
                ) : (
                  <TextField
                    select label="Tablo Seç" fullWidth value={selectedGisTable}
                    onChange={e => setSelectedGisTable(e.target.value)}
                  >
                    {gisTables.length === 0 && (
                      <MenuItem disabled value="">Tablo bulunamadı</MenuItem>
                    )}
                    {gisTables.map(t => (
                      <MenuItem key={`${t.schemaName}||${t.tableName}`} value={`${t.schemaName}||${t.tableName}`}>
                        {t.schemaName}.{t.tableName}
                        {t.rowCount > 0 && ` (≈${t.rowCount.toLocaleString('tr-TR')} satır)`}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                <TextField
                  label="Maksimum obje sayısı" type="number" fullWidth
                  value={gisLimit}
                  onChange={e => setGisLimit(Math.max(100, Math.min(50000, parseInt(e.target.value) || 10000)))}
                  helperText="Büyük tablolarda yükleme süresi uzar. Max: 50.000"
                  inputProps={{ min: 100, max: 50000, step: 1000 }}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleAddLayer} disabled={addSaving}>
            {addSaving ? <CircularProgress size={20} /> : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
