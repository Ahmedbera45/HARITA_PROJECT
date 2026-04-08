namespace Harita.API.Entities
{
    public class MapLayer : BaseEntity
    {
        public string Name { get; set; } = "";
        public string LayerType { get; set; } = ""; // "parcel", "shp", "wms"
        public string? FilePath { get; set; }        // SHP dosyası yolu
        public string? GeoJsonData { get; set; }     // Önbellek: SHP → GeoJSON
        public string? WmsUrl { get; set; }          // WMS katmanı için URL
        public string? StyleJson { get; set; }       // renk, opacity, vb.
        public bool IsVisible { get; set; } = true;
        public int Order { get; set; } = 0;
        public Guid CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }
    }
}
